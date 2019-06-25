import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export default function formatDA(date, strFormat = "MMM D, YYYY") {
  if (!date) {
    return;
  }

  const dateAsMoment = dayjs(date, "YYYYMMDD");

  return dateAsMoment.format(strFormat);
}
