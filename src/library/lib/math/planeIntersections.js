import vtkPlane from "vtk.js/Sources/Common/DataModel/Plane";
/**
 * Planes are of type `{position:[x,y,z], normal:[x,y,z]}`
 * returns an `[x,y,z]` array, or `NaN` if they do not intersect.
 */
const getPlaneIntersection = (plane1, plane2, plane3) => {
  try {
    let line = vtkPlane.intersectWithPlane(
      plane1.position,
      plane1.normal,
      plane2.position,
      plane2.normal
    );
    if (line.intersection) {
      const { l0, l1 } = line;
      const intersectionLocation = vtkPlane.intersectWithLine(
        l0,
        l1,
        plane3.position,
        plane3.normal
      );
      if (intersectionLocation.intersection) {
        return intersectionLocation.x;
      }
    }
  } catch (err) {
    console.log("some issue calculating the plane intersection", err);
  }
  return NaN;
};

export default getPlaneIntersection;
