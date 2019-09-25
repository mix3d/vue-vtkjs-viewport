import cornerstone from 'cornerstone-core'
import getSliceIndex from './data/getSliceIndex.js'
import insertSlice from './data/insertSlice.js'
import throttle from './throttle'

function loadImageDataProgressively(imageIds, imageData, metaDataMap, zAxis) {
	const loadImagePromises = imageIds.map(cornerstone.loadAndCacheImage)

	const insertPixelData = image => {
		insertImagePixelData(image, imageData, metaDataMap, zAxis)
	}

	loadImagePromises.forEach(promise => {
		promise.then(insertPixelData).catch(error => {
			console.error(error)
			// throw new Error(error);
		})
	})

	// TODO: Investigate progressive loading. Right now the UI gets super slow because
	// we are rendering and decoding simultaneously. We might want to use fewer web workers
	// for the decoding tasks.

	// return loadImagePromises[0];
	return Promise.all(loadImagePromises)
}

function insertImagePixelData(image, imageData, metaDataMap, zAxis) {
	const { imagePositionPatient } = metaDataMap.get(image.imageId)
	const sliceIndex = getSliceIndex(zAxis, imagePositionPatient)
	const pixels = image.getPixelData()
	const { slope, intercept } = image
	const numPixels = pixels.length

	// TODO: Sometimes after scaling from stored pixel value to modality
	// pixel value, the result is negative. In this case, we need to use a
	// signed array. I've hardcoded Int16 for now but I guess we can try to
	// figure out if Int8 is also an option.
	const modalityPixelsOrSUV = new Int16Array(numPixels)

	const seriesModule = cornerstone.metaData.get('generalSeriesModule', image.imageId)

	if (seriesModule && seriesModule.modality.modality === 'PT') {
		const patientStudyModule = cornerstone.metaData.get('patientStudyModule', image.imageId)
		if (!patientStudyModule) {
			throw new Error('patientStudyModule metadata is required')
		}
		const patientWeight = patientStudyModule.patientWeight // In kg
		if (!patientWeight) {
			throw new Error('patientWeight must be present in patientStudyModule for modality PT')
		}
		const petSequenceModule = cornerstone.metaData.get('petIsotopeModule', image.imageId)
		if (!petSequenceModule) {
			throw new Error('petSequenceModule metadata is required')
		}
		// TODO:
		// - Update this to match the SUV logic provided here:
		//   https://github.com/salimkanoun/fijiPlugins/blob/master/Pet_Ct_Viewer/src/SUVDialog.java
		// - Test with PET datasets from various providers to ensure SUV is correct
		const radiopharmaceuticalInfo = petSequenceModule.radiopharmaceuticalInfo
		const startTime = radiopharmaceuticalInfo.radiopharmaceuticalStartTime
		const totalDose = radiopharmaceuticalInfo.radionuclideTotalDose
		const halfLife = radiopharmaceuticalInfo.radionuclideHalfLife
		const seriesAcquisitionTime = seriesModule.seriesTime

		if (!startTime || !totalDose || !halfLife || !seriesAcquisitionTime) {
			throw new Error('The required radiopharmaceutical information was not present.')
		}

		const acquisitionTimeInSeconds =
			fracToDec(seriesAcquisitionTime.fractionalSeconds || 0) +
			seriesAcquisitionTime.seconds +
			seriesAcquisitionTime.minutes * 60 +
			seriesAcquisitionTime.hours * 60 * 60
		const injectionStartTimeInSeconds =
			fracToDec(startTime.fractionalSeconds) +
			startTime.seconds +
			startTime.minutes * 60 +
			startTime.hours * 60 * 60
		const durationInSeconds = acquisitionTimeInSeconds - injectionStartTimeInSeconds
		const correctedDose = totalDose * Math.exp((-durationInSeconds * Math.log(2)) / halfLife)

		for (let i = 0; i < numPixels; i++) {
			const modalityPixelValue = pixels[i] * slope + intercept
			const suv = (1000 * modalityPixelValue * patientWeight) / correctedDose
			modalityPixelsOrSUV[i] = suv
		}
	} else {
		for (let i = 0; i < numPixels; i++) {
			modalityPixelsOrSUV[i] = pixels[i] * slope + intercept
		}
	}

	insertSlice(imageData, modalityPixelsOrSUV, sliceIndex)
}

/**
 * Returns a decimal value given a fractional value.
 * @private
 * @method
 * @name fracToDec
 *
 * @param  {number} fractionalValue The value to convert.
 * @returns {number}                 The value converted to decimal.
 */
function fracToDec(fractionalValue) {
	return parseFloat(`.${fractionalValue}`)
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function loadImageDataProgressivelyAsync(
	imageIds,
	imageData,
	metaDataMap,
	zAxis,
	onProgressCB
) {
	const msProgress = 50
	const msLoad = 5
	const imageCount = imageIds.length
	const throttleUpdateProgress = throttle(onProgressCB, 50)

	for (let idx = 0; idx < imageCount; idx++) {
		const imageId = imageIds[idx]
		const image = await cornerstone.loadAndCacheImage(imageId)

		// const { imagePositionPatient } = metaDataMap.get(imageId)
		// const sliceIndex = getSliceIndex(zAxis, imagePositionPatient)
		// const pixels = image.getPixelData()
		// insertSlice(imageData, pixels, sliceIndex)
		try {
			insertImagePixelData(image, imageData, metaDataMap, zAxis)
		} catch (err) {
			console.error('hit an error', err)
		}

		throttleUpdateProgress((idx + 1) / imageCount)
		await wait(idx < imageCount - 1 ? msLoad : msProgress)
	}
}

export function loadImageData(imageDataObject) {
	return loadImageDataProgressively(
		imageDataObject.imageIds,
		imageDataObject.vtkImageData,
		imageDataObject.metaDataMap,
		imageDataObject.zAxis
	).then(() => {
		imageDataObject.loaded = true
	})
}

export default function loadImageDataAsync(imageDataObject, onProgressCB) {
	return loadImageDataProgressivelyAsync(
		imageDataObject.imageIds,
		imageDataObject.vtkImageData,
		imageDataObject.metaDataMap,
		imageDataObject.zAxis,
		onProgressCB
	).then(() => {
		imageDataObject.loaded = true
	})
}
