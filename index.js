var glslify = require('glslify')
var Regl = require('regl')
var load = require('resl')
var Camera = require('regl-camera')
var Vec3 = require('gl-vec3')
var Mat4 = require('gl-mat4')
var Mat3 = require('gl-mat3')
var { Sheet, Tube } = require('./mesh')

var regl = Regl({
  extensions: [ 
    'OES_texture_float',
    'OES_standard_derivatives'
  ]
})
var camera = Camera(regl, {
  distance: 8,
  theta: Math.PI / 2
})

var render = regl({
  vert: glslify`
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 tangent;
    attribute vec2 uv;

    uniform float time;
    uniform vec3 light;
    uniform mat4 model;
    uniform mat4 projection;
    uniform mat4 view;
    uniform mat3 normal_matrix;
    uniform vec3 eye;
    uniform sampler2D tx_displacement;

    varying vec3 v_world_position;
    varying vec2 v_uv;
    varying mat3 v_normal_matrix;

    void main () {
      float a = (position.z + time) * 2.;
      float dynamic_displacement = sin(a) * .2;
      float static_displacement = texture2D(tx_displacement, uv).r / 10.;
      vec3 displaced_position 
        = position 
        + static_displacement * normal
        + dynamic_displacement * normal;
      vec4 world_position = model * vec4(displaced_position, 1.);

      v_uv = uv;
      v_world_position = world_position.xyz;
      v_normal_matrix = normal_matrix;
      gl_Position = projection * view * world_position;
    } 
  `,
  frag: glslify`
    #extension GL_OES_standard_derivatives: enable

    precision highp float; 

    uniform vec3 eye;
    uniform vec3 light;
    uniform sampler2D tx_diffuse;
    uniform sampler2D tx_normal;

    varying vec3 v_world_position;
    varying vec2 v_uv;
    varying mat3 v_normal_matrix;

    const vec3 specular_color = vec3(.4);
    const vec3 ambient_color = vec3(.05);
    const float shininess = 200.;
    const float ambient_power = .1;

    #pragma glslify: phong_specular = require(glsl-specular-phong)
    #pragma glslify: transpose = require(glsl-transpose)

    void main () {
      vec3 t = normalize(dFdx(v_world_position));
      vec3 b = normalize(dFdy(v_world_position));
      vec3 n = normalize(cross(t, b));
      vec3 T = normalize(v_normal_matrix * t);
      vec3 B = normalize(v_normal_matrix * b);
      vec3 N = normalize(v_normal_matrix * n);
      mat3 TBN = transpose(mat3(T, B, N));
      vec3 tan_eye = TBN * eye;
      vec3 tan_light = TBN * light;
      vec3 tan_fragcoord = TBN * v_world_position;

      vec3 view_dir = normalize(tan_eye - tan_fragcoord);
      vec3 light_dir = normalize(tan_light - tan_fragcoord);
      vec3 diffuse_color = texture2D(tx_diffuse, v_uv).rgb;
      vec3 normal = texture2D(tx_normal, v_uv).rgb * 2. - 1.;
      float diffuse_power = max(dot(normal, view_dir), 0.);
      float specular_power = phong_specular(light_dir, view_dir, normal, shininess);
      
      vec3 color = diffuse_power * diffuse_color;

      color += ambient_color * ambient_power;
      color += specular_power * specular_color;
      gl_FragColor = vec4(color, 1);
    }
  `,
  cull: {
    enable: true 
  },
  depth: {
    enable: true 
  },
  uniforms: {
    time: regl.context('time'),
    model: regl.prop('model'),
    light: regl.prop('light'),
    tx_diffuse: regl.prop('diffuse'),
    tx_normal: regl.prop('normal'),
    tx_displacement: regl.prop('displacement'),
    normal_matrix: regl.prop('normalMatrix')
  },
  attributes: {
    position: regl.prop('mesh.vertices'),
    normal: regl.prop('mesh.normals'),
    tangent: regl.prop('mesh.tangents'),
    uv: regl.prop('mesh.uv')
  },
  elements: regl.prop('mesh.indices')
})

var renderProps = {
  model: Mat4.create(),
  mesh: new Tube(7),
  normalMatrix: Mat3.create(),
  diffuse: undefined,
  normal: undefined,
  displacement: undefined,
  light: [ 0, 0, 3 ],
}
var clearProps = {
  depth: true,
  color: [ 0, 0, 0, 1 ]
}

load({
  manifest: {
    diffuse: {
      type: 'image',
      src: 'textures/stone_COLOR.png'
    },
    normal: {
      type: 'image',
      src: 'textures/stone_NRM.png'
    },
    displacement: {
      type: 'image',
      src: 'textures/stone_DISP.png'
    }
  },
  onDone: function ({ diffuse, normal, displacement }) {
    renderProps.diffuse = regl.texture({
      data: diffuse,
      mag: 'linear',
      min: 'linear mipmap linear'
    })
    renderProps.normal = regl.texture({
      data: normal,
      mag: 'linear',
      min: 'linear mipmap linear'
    })
    renderProps.displacement = regl.texture({
      data: displacement,
      mag: 'linear',
      min: 'linear mipmap linear'
    })
    regl.frame(function ({ time }) {
      renderProps.light[2] = Math.abs(Math.sin(time) * 2 * Math.PI)
      Mat3.fromMat4(renderProps.normalMatrix, renderProps.model)
      regl.clear(clearProps)
      camera(_ => render(renderProps))
    })
  }
})
