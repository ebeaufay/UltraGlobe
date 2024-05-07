import * as THREE from 'three';
import { CloudCoverageWorker } from './CloudCoverage.worker.js';
import { LinkedHashMap } from 'js-utils-z';

const cloudsWorkerUrl = URL.createObjectURL(new Blob([CloudCoverageWorker.getScript()], { type: 'application/javascript' }));
const cloudsWorker = new Worker(cloudsWorkerUrl);
cloudsWorker.onmessage = handleCloudWorkerResponse;
cloudsWorker.onerror = handleWorkerError;

let cloudsUniforms;
let cloudsTexture;


let localTimeUTC;
let loaded3hourBefore;
let loaded3hourAfter;

const cloudsBufferCache = new LinkedHashMap();
const cacheMaxSize = 10;
const requestedTimes = new Set();

/**
 * Sets the current time and adjusts the lerp uniform relative to the loaded forecast times
 */
function setCurrentTime(localUTC) {
    if(!!localUTC){
        localTimeUTC = localUTC;
    }
    if (!cloudsUniforms || !loaded3hourBefore || !loaded3hourAfter || !localTimeUTC) return;
    const startTime = loaded3hourBefore.date.getTime();
    const endTime = loaded3hourAfter.date.getTime();

    const t = localTimeUTC.getTime();

    if (t <= startTime) {
        cloudsUniforms.realTimeLerp.value = 0.0;
        return;
    }
    if (t >= endTime) {
        cloudsUniforms.realTimeLerp.value = 1.0;
        return;
    }

    cloudsUniforms.realTimeLerp.value = (t - startTime) / (endTime - startTime);
}

/**
 * Checks if, according to local time, there are better suited forecast times available than those currently loaded.
 * If so, loads the adequate forecasts and adjusts the lerp time uniform.
 */
function checkReloadTexture() {
    let nearest3hourBefore = toUTCAndRoundToNearest3HoursStrictlyBefore(localTimeUTC);
    let nearest3hourAfter = toUTCAndRoundToNearest3HoursStrictlyAfter(localTimeUTC);
    if (!loaded3hourBefore || !loaded3hourAfter ||
        nearest3hourBefore.isoStringYYMMDDHH !== loaded3hourBefore.isoStringYYMMDDHH ||
        nearest3hourAfter.isoStringYYMMDDHH !== loaded3hourAfter.isoStringYYMMDDHH) {

        if (!cloudsBufferCache.has(nearest3hourBefore.isoStringYYMMDDHH) || !cloudsBufferCache.has(nearest3hourAfter.isoStringYYMMDDHH)) {
            return; // unavailable textures
        }

        const texData = new Uint8Array(2 * 4 * 721 * 361);

        // fetch from cache and move to tail
        const before = cloudsBufferCache.remove(nearest3hourBefore.isoStringYYMMDDHH);
        cloudsBufferCache.put(nearest3hourBefore.isoStringYYMMDDHH, before);

        const after = cloudsBufferCache.remove(nearest3hourAfter.isoStringYYMMDDHH);
        cloudsBufferCache.put(nearest3hourAfter.isoStringYYMMDDHH, after);
        //self.cache.put(entry.key, entry.value);
        texData.set(before, 0);
        texData.set(after, 4 * 721 * 361);
        if (!cloudsTexture) {
            cloudsTexture = new THREE.Data3DTexture(texData, 721, 361, 2);
            cloudsTexture.format = THREE.RGBAFormat;
            cloudsTexture.type = THREE.UnsignedByteType;
            cloudsTexture.minFilter = THREE.LinearFilter;
            cloudsTexture.magFilter = THREE.LinearFilter;
            cloudsTexture.wrapS = THREE.RepeatWrapping;
            cloudsTexture.wrapT = THREE.RepeatWrapping;
            cloudsTexture.wrapR = THREE.RepeatWrapping;
            cloudsTexture.unpackAlignment = 1;
            cloudsTexture.needsUpdate = true;

            cloudsUniforms.realTimeCoverage.value = cloudsTexture;
        } else {
            cloudsTexture.image.data.set(texData);
            cloudsTexture.needsUpdate = true;
        }

        loaded3hourBefore = nearest3hourBefore;
        loaded3hourAfter = nearest3hourAfter;
        setCurrentTime();
    }

}


function handleWorkerError() {
    console.log("no weather information for requested time");
}

function handleCloudWorkerResponse(e) {
    cloudsBufferCache.put(e.data.dateBefore,new Uint8Array(e.data.cloudsArrayBuffer1));
    cloudsBufferCache.put(e.data.dateAfter,new Uint8Array(e.data.cloudsArrayBuffer2));
    while(cloudsBufferCache.size()>cacheMaxSize){
        const key = cloudsBufferCache.head().key;
        cloudsBufferCache.remove(key);
        requestedTimes.delete(key);
    }
    checkReloadTexture();

}


async function realtimeWeather(aCloudsUniforms, ultraClock) {
    let mostRecentReportTime = await getNearestAvailableNOAAReportDate();

    cloudsUniforms = aCloudsUniforms;


    let time;

    ultraClock.addListener(date => {

        date = new Date(date.toUTCString());
        let reportTime = mostRecentReportTime;
        if (date < mostRecentReportTime.date) {
            reportTime = toUTCAndRoundToNearest6HoursStrictlyBefore(date);
        }


        setCurrentTime(date);
        let nearest3hourBefore = toUTCAndRoundToNearest3HoursStrictlyBefore(date);
        let nearest3hourAfter = toUTCAndRoundToNearest3HoursStrictlyAfter(date);

        if (cloudsBufferCache.has(nearest3hourBefore.isoStringYYMMDDHH) && cloudsBufferCache.has(nearest3hourAfter.isoStringYYMMDDHH)) {
            checkReloadTexture(localTimeUTC, nearest3hourBefore, nearest3hourAfter);
            return;
        }

        if (requestedTimes.has(nearest3hourBefore.isoStringYYMMDDHH) && requestedTimes.has(nearest3hourAfter.isoStringYYMMDDHH)) {
            return; // the time has already been requested so it hasn't finished loading yet, we just need to wait.. 
        }

        let time1 = nearest3hourBefore;
        let time2 = nearest3hourAfter;
        if(requestedTimes.has(time1.isoStringYYMMDDHH)){
            time1 = time2;
            time2 = toUTCAndRoundToNearest3HoursStrictlyAfter(time2.date);
        }
        
        requestedTimes.add(time1.isoStringYYMMDDHH);
        requestedTimes.add(time2.isoStringYYMMDDHH);

        cloudsWorker.postMessage({
            dateBefore: time1.isoStringYYMMDDHH,
            dateAfter: time2.isoStringYYMMDDHH,
            reportTime: reportTime,
            beforeIndex: calculate3HourIncrementsDifference(reportTime.date, time1.date),
            afterIndex: calculate3HourIncrementsDifference(reportTime.date, time2.date),
        });

    });
}

async function getNearestAvailableNOAAReportDate() {
    let date = new Date();
    let timeNearest;
    let response;
    let i = 0;
    do {
        i++;
        timeNearest = toUTCAndRoundToNearest6HoursStrictlyBefore(date);
        let url = `https://europe-west1-jdultra.cloudfunctions.net/corsproxy?https://nomads.ncep.noaa.gov/dods/gfs_0p50/gfs${timeNearest.isoStringYYMMDD}/gfs_0p50_${String(timeNearest.nearest6HourIncrementHour).padStart(2, '0')}z.info`;
        response = await fetch(url);
        let responseData = await response.text();
        if (!response.ok || responseData.includes('is not an available dataset')) {
            date.setHours(date.getHours() - 6);
        } else {
            break;
        }
    } while (i < 10);

    if (!response.ok) throw "NOAA unavailable";

    return timeNearest;
}
function toUTCAndRoundToNearest6HoursStrictlyBefore(date) {
    // Convert local date to UTC
    const dateInUTC = new Date(date.toUTCString());

    // Milliseconds for calculation
    const sixHoursInMilliseconds = 6 * 60 * 60 * 1000;

    // Calculate the difference in milliseconds from the nearest lower 6-hour mark
    const remainder = dateInUTC.getTime() % sixHoursInMilliseconds;

    // If the date is exactly on a 6-hour mark, subtract 6 hours to ensure it's strictly before
    const adjustment = remainder === 0 ? sixHoursInMilliseconds : 0;

    // Round down to the nearest x-hour increment in UTC and adjust if necessary
    const roundedTime = dateInUTC.getTime() - remainder - adjustment;
    const roundedDate = new Date(roundedTime);

    // Format to 'YYMMDD'
    const year = String(roundedDate.getUTCFullYear()).slice(-4); // Get last 4 digits of the year
    const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(roundedDate.getUTCDate()).padStart(2, '0');

    const isoStringYYMMDD = `${year}${month}${day}`;

    // Calculate the nearest x-hour increment hour (0, x, 12, 18) before the current hour
    const hour = roundedDate.getUTCHours();

    return {
        isoStringYYMMDD,
        nearest6HourIncrementHour: hour,
        date: roundedDate
    };
}

function toUTCAndRoundToNearest3HoursStrictlyBefore(date) {
    // Convert local date to UTC
    const dateInUTC = new Date(date.toUTCString());

    // Milliseconds for calculation
    const threeHoursInMilliseconds = 3 * 60 * 60 * 1000;

    // Calculate the difference in milliseconds from the nearest lower 6-hour mark
    const remainder = dateInUTC.getTime() % threeHoursInMilliseconds;

    // If the date is exactly on a 6-hour mark, subtract 6 hours to ensure it's strictly before
    const adjustment = remainder === 0 ? threeHoursInMilliseconds : 0;

    // Round down to the nearest x-hour increment in UTC and adjust if necessary
    const roundedTime = dateInUTC.getTime() - remainder - adjustment;
    const roundedDate = new Date(roundedTime);

    // Format to 'YYMMDD'
    const year = String(roundedDate.getUTCFullYear()).slice(-4); // Get last 4 digits of the year
    const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(roundedDate.getUTCDate()).padStart(2, '0');
    const hour = String(roundedDate.getUTCHours()).padStart(2, '0');

    const isoStringYYMMDD = `${year}${month}${day}`;
    const isoStringYYMMDDHH = `${year}${month}${day}${hour}`;

    // Calculate the nearest x-hour increment hour (0, x, 12, 18) before the current hour
    

    return {
        isoStringYYMMDD,
        isoStringYYMMDDHH,
        nearest3HourIncrementHour: roundedDate.getUTCHours(),
        date: roundedDate
    };
}

function toUTCAndRoundToNearest3HoursStrictlyAfter(date) {
    // Convert local date to UTC
    const dateInUTC = new Date(date.toUTCString());

    // Milliseconds for calculation
    const threeHoursInMilliseconds = 3 * 60 * 60 * 1000;

    // Calculate the difference in milliseconds from the nearest lower 6-hour mark
    const remainder = dateInUTC.getTime() % threeHoursInMilliseconds;

    // If the date is exactly on a 6-hour mark, subtract 6 hours to ensure it's strictly before
    const adjustment = remainder === 0 ? threeHoursInMilliseconds : threeHoursInMilliseconds - remainder;

    // Round down to the nearest x-hour increment in UTC and adjust if necessary
    const roundedTime = dateInUTC.getTime() + adjustment;
    const roundedDate = new Date(roundedTime);

    // Format to 'YYMMDD'
    const year = String(roundedDate.getUTCFullYear()).slice(-4); // Get last 4 digits of the year
    const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(roundedDate.getUTCDate()).padStart(2, '0');
    const hour = String(roundedDate.getUTCHours()).padStart(2, '0');

    const isoStringYYMMDD = `${year}${month}${day}`;
    const isoStringYYMMDDHH = `${year}${month}${day}${hour}`;

    // Calculate the nearest x-hour increment hour (0, x, 12, 18) before the current hour
    
    return {
        isoStringYYMMDD,
        isoStringYYMMDDHH,
        nearest3HourIncrementHour: roundedDate.getUTCHours(),
        date: roundedDate
    };
}

function calculate3HourIncrementsDifference(date1, date2) {
    // Ensure date1 is the earlier and date2 is the later date
    const startTime = Math.min(date1.getTime(), date2.getTime());
    const endTime = Math.max(date1.getTime(), date2.getTime());

    // Calculate the difference in milliseconds
    const differenceInMilliseconds = endTime - startTime;

    // Convert milliseconds to hours
    const differenceInHours = differenceInMilliseconds / (1000 * 60 * 60);

    // Calculate the number of 3-hour increments
    const increments = differenceInHours / 3;

    // Return the number of 3-hour increments, rounded down since partial increments are not counted fully
    return Math.floor(increments);
}

/* function toUTC(date) {
    // Convert local date to UTC
    const dateInUTC = new Date(date.toUTCString());

    // Format to 'YYMMDD'
    const year = String(dateInUTC.getUTCFullYear()).slice(-4); // Get last 4 digits of the year
    const month = String(dateInUTC.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateInUTC.getUTCDate()).padStart(2, '0');
    const hour = String(dateInUTC.getUTCHours()).padStart(2, '0');

    const isoStringYYMMDD = `${year}${month}${day}`;

    // Calculate the nearest x-hour increment hour (0, x, 12, 18) before the current hour
    const hour = dateInUTC.getUTCHours();

    return {
        isoStringYYMMDD,
        nearest6HourIncrementHour: hour,
        date: dateInUTC
    };
} */

export { realtimeWeather }