
const CloudCoverageWorker = {
    getScript : ()=> {
        return `
        onmessage = function (e) {
            
            /* { 
                dateBefore: nearest3hourBefore.isoStringYYMMDDHH, 
                dateAfter: nearest3hourAfter.isoStringYYMMDDHH, 
                reportTime: reportTime , 
                beforeIndex: calculate3HourIncrementsDifference(reportTime.date, nearest3hourBefore.date) ,
                afterIndex: calculate3HourIncrementsDifference(reportTime.date, nearest3hourAfter.date) ,
            } */

            e.data.beforeIndex

            let forecast_time = String(e.data.forecast_time).padStart(2, '0')
            try{
                const cloudsArrayBuffer1 = new ArrayBuffer(361 * 721 * 4);
                const cloudsArrayBuffer2 = new ArrayBuffer(361 * 721 * 4);

                const cloudsBuffer1 = new Uint8Array(cloudsArrayBuffer1);
                const cloudsBuffer2 = new Uint8Array(cloudsArrayBuffer2);
                Promise.all([
                    get_gfs_data(
                        '0p50',
                        e.data.reportTime.isoStringYYMMDD, // YYYMMDD format date
                        String(e.data.reportTime.nearest6HourIncrementHour).padStart(2, '0'), // Every 6 hours. 00, 06, 12, or 18
                        [-90, 90], // Lat range
                        [0, 359.5], // Lon range
                        [e.data.beforeIndex, e.data.afterIndex],  // forecast indices
                        'lcdclcll' // The requested data item
                    ).then((result) => {
                        for (let y = 0; y < 361; y++) {
                            for (let x = 0; x < 721; x++) {
                                const index = (y * 721 + x) * 4;
                                cloudsBuffer1[index] = Math.max(0, Math.min(255, result[0][y][x % 720] * 2.56));
                                cloudsBuffer2[index] = Math.max(0, Math.min(255, result[1][y][x % 720] * 2.56));
                                
                            }
                        }
                    }),
                    get_gfs_data(
                        '0p50',
                        e.data.reportTime.isoStringYYMMDD, // YYYMMDD format date
                        String(e.data.reportTime.nearest6HourIncrementHour).padStart(2, '0'), // Every 6 hours. 00, 06, 12, or 18
                        [-90, 90], // Lat range
                        [0, 359.5], // Lon range
                        [e.data.beforeIndex, e.data.afterIndex],  // forecast indices
                        'mcdcmcll' // The requested data item
                    ).then((result) => {
                        
                        for (let y = 0; y < 361; y++) {
                            for (let x = 0; x < 721; x++) {
                                const index = (y * 721 + x) * 4 + 1;
                                cloudsBuffer1[index] = Math.max(0, Math.min(255, result[0][y][x % 720] * 2.56));
                                cloudsBuffer2[index] = Math.max(0, Math.min(255, result[1][y][x % 720] * 2.56));
                            }
                        }
                    }),
                    get_gfs_data(
                        '0p50',
                        e.data.reportTime.isoStringYYMMDD, // YYYMMDD format date
                        String(e.data.reportTime.nearest6HourIncrementHour).padStart(2, '0'), // Every 6 hours. 00, 06, 12, or 18
                        [-90, 90], // Lat range
                        [0, 359.5], // Lon range
                        [e.data.beforeIndex, e.data.afterIndex],  // forecast indices
                        'hcdchcll' // The requested data item
                    ).then((result) => {
                        for (let y = 0; y < 361; y++) {
                            for (let x = 0; x < 721; x++) {
                                const index = (y * 721 + x) * 4 + 2;
                                cloudsBuffer1[index] = Math.max(0, Math.min(255, result[0][y][x % 720] * 2.56));
                                cloudsBuffer2[index] = Math.max(0, Math.min(255, result[1][y][x % 720] * 2.56));
                            }
                        }
                    })
                ]).then(() => {
                    postMessage({
                        cloudsArrayBuffer1:cloudsArrayBuffer1, 
                        cloudsArrayBuffer2:cloudsArrayBuffer2,
                        dateBefore: e.data.dateBefore, 
                        dateAfter: e.data.dateAfter 
                    }, [cloudsArrayBuffer1, cloudsArrayBuffer2, e.data.dateBefore, e.data.dateAfter]);
                });
            }catch(error){
                postMessage({error:error});
            }
        };


        function getLastRow (gfs_response){
            const response_split = gfs_response.split('\\n');
            for (var i = response_split.length - 2; i >= 0; i--) {
                if(response_split[i] === '' && response_split[i+1] === '') {
                    return i;
                }
            }
            return 0;
        }
        
        
        async function get_gfs_data (
            resolution='1p00',
            forecast_date=new Date(Date.now() - 86400000).toISOString().split('T')[0].replaceAll('-',''),
            forecast_time='00', // Every 6 hours. 00, 06, 12, or 18
            lat_range=[42,43],
            lon_range=[-73, -74],
            forward_times=[0,1], // forecast indices
            field='gustsfc'
        ) {
            const lat_start_input = lat_range[0];
            const lat_end_input = lat_range[1];
            const lon_start_input = lon_range[0];
            const lon_end_input = lon_range[1];
            lat_start = Math.min(lat_start_input + 90, lat_end_input + 90);
            lat_end = Math.max(lat_start_input + 90, lat_end_input + 90);
            lon_start = Math.min((lon_start_input + 360) % 360, (lon_end_input + 360) % 360);
            lon_end = Math.max((lon_start_input + 360) % 360, (lon_end_input + 360) % 360);
        
            // Map each to their respective increments, this will be useful when we figure out proper indexes
            const resolution_option_increments = {
                "1p00": 1,
                "0p50": 0.5,
                "0p25": 0.25
            };
            // Compute the indexes for lat/lon to start/end
            const lat_start_index = Math.floor((lat_start) / resolution_option_increments[resolution]);
            const lat_end_index = Math.ceil((lat_end) / resolution_option_increments[resolution]);
            const lon_start_index = Math.floor((lon_start) / resolution_option_increments[resolution]);
            const lon_end_index = Math.ceil((lon_end) / resolution_option_increments[resolution]);
        
            let altitude = '';
            // Only these fields have an altitude component. Set it to [1], which is roughly surface level.
            // Future improvement to allow this to be customized as well.
            if ([
                'absvprs', 'clwmrprs', 'dzdtprs', 'grleprs', 'hgtprs', 'icmrprs', 'o3mrprs', 'rhprs',
                'rwmrprs', 'snmrprs', 'spfhprs', 'tmpprs', 'ugrdprs', 'vgrdprs', 'vvelprs'].includes(field)) {
                altitude = '[1]';
            }
        
            url = 'https://europe-west1-jdultra.cloudfunctions.net/corsproxy?https://nomads.ncep.noaa.gov/dods/gfs_'+resolution+'/gfs'+forecast_date+'/gfs_'+resolution+'_'+forecast_time+'z.ascii?'+field+'['+forward_times[0]+':'+forward_times[1]+']'+altitude+'['+lat_start_index+':'+lat_end_index+']['+lon_start_index+':'+lon_end_index+']';
            
            response = await fetch(url);

             const noaa_res = await response.text();

             const lastRow = getLastRow(noaa_res);
                const noaa_res_split = noaa_res.split('\\n');
                const data = noaa_res_split.slice(1, lastRow);
                const data_str = data.join('\\n');
                const time_data_blocks = data_str.split('\\n\\n').map((each) => each.split('\\n').filter((each) => each).map((each) => each.split(', ').slice(1,)));
        
                return time_data_blocks;
            
            
        }
        `
    }
};
export { CloudCoverageWorker };