function hasNodeIndex(value) {
  return value !== undefined && value !== null && value !== '';
}

function isAnnotationPresentationObject(object) {
  return !!(object && object.userData && (
    object.userData.annotationPresentation === true ||
    object.userData.pickable === false
  ));
}

function markAnnotationObjectNonPickable(object, role) {
  if (!object) return object;
  object.userData = object.userData || {};
  object.userData.annotationPresentation = true;
  object.userData.pickable = false;
  object.userData.annotationRole = role || 'annotation';
  object.raycast = function () {};
  return object;
}

function isPickableNodeIntersection(intersection) {
  if (!intersection || !intersection.object) return false;
  const object = intersection.object;
  if (isAnnotationPresentationObject(object)) return false;
  if (!object.name || object.name.type !== 'region') return false;
  if (!hasNodeIndex(intersection.instanceId)) return false;
  return typeof object.getDatasetIndex === 'function';
}

function firstPickableNodeIntersection(intersections) {
  if (!Array.isArray(intersections)) return undefined;
  for (let i = 0; i < intersections.length; i++) {
    if (isPickableNodeIntersection(intersections[i])) return intersections[i];
  }
  return undefined;
}

module.exports = {
  firstPickableNodeIntersection,
  hasNodeIndex,
  isAnnotationPresentationObject,
  isPickableNodeIntersection,
  markAnnotationObjectNonPickable
};
