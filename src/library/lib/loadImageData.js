import cornerstone from "cornerstone-core";
import getSliceIndex from "./data/getSliceIndex.js";
import insertSlice from "./data/insertSlice.js";
import throttle from "./throttle";

function loadImageDataProgressively(imageIds, imageData, metaDataMap, zAxis) {
  const loadImagePromises = imageIds.map(cornerstone.loadAndCacheImage);

  const insertPixelData = image => {
    const { imagePositionPatient } = metaDataMap.get(image.imageId);
    const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);
    const pixels = image.getPixelData();

    insertSlice(imageData, pixels, sliceIndex);
  };

  loadImagePromises.forEach(promise => {
    promise.then(insertPixelData).catch(error => {
      console.error(error);
      //throw new Error(error);
    });
  });

  // TODO: Investigate progressive loading. Right now the UI gets super slow because
  // we are rendering and decoding simultaneously. We might want to use fewer web workers
  // for the decoding tasks.

  //return loadImagePromises[0];
  return Promise.all(loadImagePromises);
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadImageDataProgressivelyAsync(
  imageIds,
  imageData,
  metaDataMap,
  zAxis,
  onProgressCB
) {
  const msProgress = 50;
  const msLoad = 5;
  const imageCount = imageIds.length;
  const throttleUpdateProgress = throttle(onProgressCB, 50);

  for (let idx = 0; idx < imageCount; idx++) {
    const imageId = imageIds[idx];
    const image = await cornerstone.loadAndCacheImage(imageId);
    const { imagePositionPatient } = metaDataMap.get(imageId);
    const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);
    const pixels = image.getPixelData();
    insertSlice(imageData, pixels, sliceIndex);
    throttleUpdateProgress((idx + 1) / imageCount);
    await wait(idx < imageCount - 1 ? msLoad : msProgress);
  }
}

export function loadImageData(imageDataObject) {
  return loadImageDataProgressively(
    imageDataObject.imageIds,
    imageDataObject.vtkImageData,
    imageDataObject.metaDataMap,
    imageDataObject.zAxis
  ).then(() => {
    imageDataObject.loaded = true;
  });
}

export default function loadImageDataAsync(imageDataObject, onProgressCB) {
  return loadImageDataProgressivelyAsync(
    imageDataObject.imageIds,
    imageDataObject.vtkImageData,
    imageDataObject.metaDataMap,
    imageDataObject.zAxis,
    onProgressCB
  ).then(() => {
    imageDataObject.loaded = true;
  });
}
