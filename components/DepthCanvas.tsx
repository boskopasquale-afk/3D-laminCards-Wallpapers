import React, { useRef, useEffect } from 'react';

interface DepthCanvasProps {
  image: string;
  depthMap: string;
  rotation: { x: number; y: number };
  settings: {
    depthIntensity: number;
    lightIntensity: number;
  };
  className?: string;
}

export const DepthCanvas: React.FC<DepthCanvasProps> = ({ 
  image, 
  depthMap, 
  rotation, 
  settings,
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // --- Shaders ---
    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        // Flip Y for texture coords
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uImage;
      uniform sampler2D uDepth;
      uniform vec2 uMouse;
      uniform float uIntensity;
      uniform float uLightIntensity;
      
      varying vec2 vUv;

      void main() {
        vec4 depthMap = texture2D(uDepth, vUv);
        float depth = depthMap.r; // Assume grayscale
        
        // 1. Parallax Displacement
        // Move texture coordinates based on depth and mouse position
        // Closer objects (high depth value) move MORE opposite to movement to create parallax
        vec2 displacement = uMouse * depth * uIntensity * 0.05;
        vec2 displacedUv = vUv - displacement;
        
        // Clamp UVs to avoid wrapping artifacts
        // displacedUv = clamp(displacedUv, 0.0, 1.0);

        vec4 color = texture2D(uImage, displacedUv);

        // 2. Dynamic Lighting (Relief Effect)
        // We calculate "Normal" vectors from the depth map gradient
        float step = 0.005;
        float dLeft = texture2D(uDepth, vUv + vec2(-step, 0.0)).r;
        float dRight = texture2D(uDepth, vUv + vec2(step, 0.0)).r;
        float dUp = texture2D(uDepth, vUv + vec2(0.0, -step)).r;
        float dDown = texture2D(uDepth, vUv + vec2(0.0, step)).r;

        float dX = dRight - dLeft;
        float dY = dDown - dUp;

        // The normal vector of the surface
        vec3 normal = normalize(vec3(dX * 10.0, dY * 10.0, 1.0));
        
        // Light direction based on mouse (simulating a light source moving with the viewer or opposite)
        // Let's make the light come from the top-left by default, modified by mouse
        vec3 lightDir = normalize(vec3(-uMouse.x, uMouse.y, 0.5));
        
        // Diffuse lighting (Lambert)
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        // Specular lighting (Shininess)
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 reflectDir = reflect(-lightDir, normal);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 16.0); // Shininess

        // Combine
        vec3 lighting = vec3(1.0) * (diffuse * 0.5 + 0.5); // Ambient + Diffuse
        lighting += specular * 0.3; // Add shine
        
        // Apply intensity setting
        vec3 finalColor = color.rgb * (1.0 - uLightIntensity + (lighting * uLightIntensity));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // --- Compile Shaders ---
    const compileShader = (src: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const frag = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.useProgram(program);

    // --- Buffers ---
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 
       1, -1, 
      -1,  1, 
      -1,  1, 
       1, -1, 
       1,  1
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // --- Textures ---
    const createTexture = (src: string, unit: number) => {
      const tex = gl.createTexture();
      const imageEl = new Image();
      imageEl.crossOrigin = "anonymous";
      imageEl.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageEl);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };
      imageEl.src = src;
      return tex;
    };

    createTexture(image, 0);
    createTexture(depthMap, 1);

    // --- Uniforms ---
    const uImageLoc = gl.getUniformLocation(program, 'uImage');
    const uDepthLoc = gl.getUniformLocation(program, 'uDepth');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uIntensityLoc = gl.getUniformLocation(program, 'uIntensity');
    const uLightIntensityLoc = gl.getUniformLocation(program, 'uLightIntensity');

    gl.uniform1i(uImageLoc, 0);
    gl.uniform1i(uDepthLoc, 1);

    // --- Render Loop ---
    const render = () => {
      // Handle Resize
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      // Smooth interpolation could go here, but we'll use raw props for reactiveness
      // Inverting x/y to match shader expectations
      gl.uniform2f(uMouseLoc, rotation.y * 1.5, -rotation.x * 1.5); 
      gl.uniform1f(uIntensityLoc, settings.depthIntensity / 20.0); // Normalize scale
      gl.uniform1f(uLightIntensityLoc, settings.lightIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(requestRef.current);
  }, [image, depthMap, rotation, settings]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full object-cover ${className}`} 
    />
  );
};