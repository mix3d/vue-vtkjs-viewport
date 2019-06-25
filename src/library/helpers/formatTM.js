import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export default function formatTM(time, formatStr = "HH:mm:ss") {
  if (!time) {
    return;
  }

  // DICOM Time is stored as HHmmss.SSS, where:
  //      HH 24 hour time:
  //      m mm    0..59   Minutes
  //      s ss    0..59   Seconds
  //      S SS SSS    0..999  Fractional seconds
  //
  // See dayjs: https://github.com/iamkun/dayjs/blob/v1.8.14/docs/en/Plugin.md#customparseformat
  const dateTime = dayjs(time, "HHmmss.SSS", new Date());

  return dateTime.format(formatStr);
}
