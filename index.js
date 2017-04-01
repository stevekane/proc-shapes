var glslify = require('glslify')
var Regl = require('regl')
var load = require('resl')
var Camera = require('regl-camera')
var Vec3 = require('gl-vec3')
var Mat4 = require('gl-mat4')

var regl = Regl({})
var camera = Camera(regl, {
  distance: 4,
  theta: Math.PI / 2
})

var render = regl({
  vert: glslify`
    #pragma glslify: transpose = require(glsl-transpose)

    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 tangent;
    attribute vec2 uv;

    uniform vec3 light;
    uniform mat4 model;
    uniform mat4 projection;
    uniform mat4 view;
    uniform vec3 eye;

    varying vec3 tan_frag_position;
    varying vec3 tan_eye_position;
    varying vec3 tan_light_position;
    varying vec2 v_uv;

    void main () {
      mat3 normal_matrix = mat3(model); 
      vec3 bitangent = cross(normal, tangent);
      vec3 T = normalize(normal_matrix * tangent);
      vec3 B = normalize(normal_matrix * bitangent);
      vec3 N = normalize(normal_matrix * normal);
      mat3 TBN = transpose(mat3(T, B, N));

      tan_frag_position = TBN * position;
      tan_eye_position = TBN * eye;
      tan_light_position = TBN * light;
      v_uv = uv;
      gl_Position = projection * view * model * vec4(position, 1.);
    } 
  `,
  frag: `
    precision mediump float; 

    uniform sampler2D diffuse;

    varying vec3 tan_frag_position;
    varying vec3 tan_eye_position;
    varying vec3 tan_light_position;
    varying vec2 v_uv;

    const vec3 normal = vec3(0, 0, 1);

    void main () {
      vec3 V = normalize(tan_light_position - tan_frag_position);
      vec3 diffuse_color = texture2D(diffuse, v_uv).rgb;
      vec3 diffuse = diffuse_color * max(dot(normal, V), 0.);
      
      gl_FragColor = vec4(diffuse, 1);
    }
  `,
  cull: {
    enable: true 
  },
  uniforms: {
    model: regl.prop('model'),
    light: regl.prop('light'),
    diffuse: regl.prop('diffuse')
  },
  attributes: {
    position: regl.prop('mesh.vertices'),
    normal: regl.prop('mesh.normals'),
    tangent: regl.prop('mesh.tangents'),
    uv: regl.prop('mesh.uv')
  },
  elements: regl.prop('mesh.indices')
})

function Sheet ( x, pwr ) {
  var sliceCount = Math.pow(2, pwr)
  var uvDelta = 1 / sliceCount

  this.vertices = []
  this.normals = []
  this.tangents = []
  this.uv = []
  this.indices = []
  for ( var i = 0; i <= sliceCount; i++ ) {
    for ( var j = 0; j <= sliceCount; j++ ) {
      this.vertices.push((j / sliceCount * 2 - 1) * x, (i / sliceCount * 2 - 1) * x, 0)
      this.normals.push(0, 0, 1)
      this.tangents.push(0, 1, 0)
      this.uv.push(i * uvDelta, j * uvDelta)
    } 
  }
  for ( var i = 0; i < sliceCount; i++ ) {
    for ( var j = 0, ll, ul; j < sliceCount; j++ ) {
      ll = i * ( sliceCount + 1 ) + j
      ul = ll + sliceCount + 1

      this.indices.push(ll, ll + 1, ul, ll + 1, ul + 1, ul)
    }
  }
}

function Tube ( pwr ) {
  var radius = 1
  var circumference = 2 * Math.PI * radius
  var sliceCount = Math.pow(2, pwr)
  var sliceLength = circumference / sliceCount
  var uvDelta = 1 / sliceCount

  this.vertices = []
  this.normals = []
  this.tangents = []
  this.uv = []
  this.indices = []
  for ( var j = 0; j <= sliceCount; j++ ) {
    for ( var i = 0, theta = 0, x, y, z; i <= sliceCount; i++ ) {
      theta = 2 * Math.PI * i / sliceCount
      x = radius * Math.cos(theta)
      y = radius * Math.sin(theta)
      z = j * sliceLength
      this.vertices.push(x, y, z)
      this.normals.push(normalize(-x, x, y, z), normalize(-y, x, y, z), 0)
      this.tangents.push(0, 0, 1)
      this.uv.push(i * uvDelta, j * uvDelta)
    }
  }
  for ( var i = 0; i < sliceCount; i++ ) {
    for ( var j = 0, ll, ul; j < sliceCount; j++ ) {
      ll = i * ( sliceCount + 1 ) + j
      ul = ll + sliceCount + 1

      this.indices.push(ll, ul, ll + 1, ll + 1, ul, ul + 1)
    }
  }
}

function normalize ( v, x, y, z ) {
  return v / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2))
}

var renderProps = {
  model: Mat4.create(),
  mesh: new Tube(6),
  diffuse: undefined,
  light: [ 0, 0, 2 ]
}
var clearProps = {
  color: [ 0, 0, 0, 1 ]
}

load({
  manifest: {
    diffuse: {
      type: 'image',
      src: 'textures/tiles.jpg'
    } 
  },
  onDone: function ({ diffuse }) {
    renderProps.diffuse = regl.texture({
      data: diffuse,
      wrapS: 'repeat',
      wrapT: 'repeat',
      mag: 'linear',
      min: 'linear mipmap linear'
    })
    regl.frame(function ({ time }) {
      renderProps.light[2] = Math.abs(Math.sin(time) * 2 * Math.PI)
      regl.clear(clearProps)
      camera(_ => render(renderProps))
    })
  }
})
