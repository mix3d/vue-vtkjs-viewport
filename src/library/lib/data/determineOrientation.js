// Based on David Clunie's various postings
// on the dicom google groupd.
export default function determineOrientation(v) {
  let axis
  const oX = v[0] < 0 ? 'R' : 'L'
  const oY = v[1] < 0 ? 'A' : 'P'
  const oZ = v[2] < 0 ? 'I' : 'S'

  const aX = Math.abs(v[0])
  const aY = Math.abs(v[1])
  const aZ = Math.abs(v[2])
  const obliqueThreshold = 0.8
  if (aX > obliqueThreshold && aX > aY && aX > aZ) {
    axis = oX
  } else if (aY > obliqueThreshold && aY > aX && aY > aZ) {
    axis = oY
  } else if (aZ > obliqueThreshold && aZ > aX && aZ > aY) {
    axis = oZ
  }

  return axis
}
