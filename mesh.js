module.exports.Sheet = Sheet
module.exports.Tube = Tube

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
