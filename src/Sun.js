// @ts-nocheck
import * as THREE from 'three';
const degreesToRadians = 0.01745329251994329576923690768489;
const radiansToDegrees = 57.295779513082320876798154814105;

// Calculate position of the Sun
let calculateSunPosition = function (date) {
  const jd = (date / 86400000) /* - (date.getTimezoneOffset() / 1440) */ + 2440587.5;
  const UT1 = (jd - 2451545) / 36525;
  const longMSUN = 280.4606184 + 36000.77005361 * UT1;
  const mSUN = 357.5277233 + 35999.05034 * UT1;
  const ecliptic = longMSUN + 1.914666471 * Math.sin(mSUN * degreesToRadians) + 0.918994643 * Math.sin(2 * mSUN * degreesToRadians);
  const eccen = 23.439291 - 0.0130042 * UT1;
  const x = Math.cos(ecliptic * degreesToRadians);
  const y = Math.cos(eccen * degreesToRadians) * Math.sin(ecliptic * degreesToRadians);
  const z = Math.sin(eccen * degreesToRadians) * Math.sin(ecliptic * degreesToRadians);
  const gst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * UT1 * UT1 - UT1 * UT1 * UT1 / 38710000;
  const radGst = gst * degreesToRadians;
  const ECEFx = x * Math.cos(radGst) + y * Math.sin(radGst);
  const ECEFy = -x * Math.sin(radGst) + y * Math.cos(radGst);
  const ECEFz = z;  // no change to the z-coordinate
  
  return new THREE.Vector3(ECEFx, ECEFy, ECEFz).normalize();
}

function getSunPosition(date) {
  return calculateSunPosition(date)
}
export { getSunPosition }