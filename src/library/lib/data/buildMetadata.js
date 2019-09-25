export default function buildMetadata(imageIds, metaDataProvider) {
  // Retrieve the Cornerstone imageIds from the display set
  // TODO: In future, we want to get the metadata independently from Cornerstone
  // NOTE: The caller of buildMetaData must have already registered a metaData Provider
  const imagePixelMetaData = metaDataProvider(
    'imagePixelModule',
    imageIds[0]
  )
  const {
    pixelRepresentation,
    bitsAllocated,
    bitsStored,
    highBit,
    photometricInterpretation,
    samplesPerPixel,
  } = imagePixelMetaData

  // Compute the image size and spacing given the meta data we already have available.
  const metaDataMap = new Map()
  imageIds.forEach(imageId => {
    // TODO: Retrieve this from somewhere other than Cornerstone
    const metaData = metaDataProvider('imagePlaneModule', imageId)

    metaDataMap.set(imageId, metaData)
  })

  return {
    metaData0: metaDataMap.values().next().value,
    metaDataMap,
    imageIds,
    imageMetaData0: {
      bitsAllocated,
      bitsStored,
      samplesPerPixel,
      highBit,
      photometricInterpretation,
      pixelRepresentation,
    },
  }
}
