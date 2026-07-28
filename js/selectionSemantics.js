function hasNodeIndex(value) {
  return value !== undefined && value !== null && value !== '';
}

function normalizeSelectionMode(value) {
  const mode = String(value || 'additive').toLowerCase();
  if (mode === 'replace') return 'replace';
  return 'additive';
}

function shouldReplaceSelection(options = {}, currentMode = 'additive') {
  if (Object.prototype.hasOwnProperty.call(options, 'replaceSelection')) {
    return options.replaceSelection !== false;
  }
  return normalizeSelectionMode(currentMode) === 'replace';
}

function normalizeNodeIndex(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
}

function sameNodeIndex(left, right) {
  return String(left) === String(right);
}

function selectionTransition(selectedBefore = [], targetNodeId, options = {}) {
  const selected = Array.from(new Set((selectedBefore || []).map(normalizeNodeIndex)));

  if (!hasNodeIndex(targetNodeId)) {
    return {
      action: 'none',
      selectedAfter: selected
    };
  }

  const target = normalizeNodeIndex(targetNodeId);
  const replaceSelection = options.replaceSelection === true;
  const toggleSelected = options.toggleSelected !== false;
  const alreadySelected = selected.some(nodeId => sameNodeIndex(nodeId, target));

  if (replaceSelection) {
    return {
      action: 'select',
      selectedAfter: [target]
    };
  }

  if (alreadySelected && toggleSelected) {
    return {
      action: 'deselect',
      selectedAfter: selected.filter(nodeId => !sameNodeIndex(nodeId, target))
    };
  }

  if (alreadySelected) {
    return {
      action: 'select',
      selectedAfter: selected
    };
  }

  return {
    action: 'select',
    selectedAfter: selected.concat([target])
  };
}

function isAnnotationPresentationObject(object) {
  return !!(
    object &&
    object.userData &&
    (
      object.userData.annotationPresentation === true ||
      object.userData.pickable === false
    )
  );
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

function isNodeIntersection(intersection) {
  if (!intersection || !intersection.object) return false;

  const object = intersection.object;

  if (isAnnotationPresentationObject(object)) return false;

  return (
    typeof object.getDatasetIndex === 'function' &&
    hasNodeIndex(intersection.instanceId)
  );
}

function firstPickableNodeIntersection(intersections) {
  if (!Array.isArray(intersections)) return undefined;

  for (let i = 0; i < intersections.length; i++) {
    if (isNodeIntersection(intersections[i])) {
      return intersections[i];
    }
  }

  return undefined;
}

module.exports = {
  firstPickableNodeIntersection,
  hasNodeIndex,
  isAnnotationPresentationObject,
  isPickableNodeIntersection: isNodeIntersection,
  markAnnotationObjectNonPickable,
  normalizeSelectionMode,
  selectionTransition,
  shouldReplaceSelection
};
