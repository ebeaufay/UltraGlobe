// Constants
let nkEngineResolved = false ;
let nkEnginePromise = null ;
let nkImages = null ;
let nkResources = null ;

// Callback
onmessage = function (message)
{
    // Keep data
    const data = message.data ;

    // Check message type
    // 0 is init
    if (data._type == 0)
    {
        // Import what we need
        importScripts("../nkEngine/NilkinsEngine.js") ;
        importScripts("WorkType.js") ;

        // Prepare nkEngine
        nkEnginePromise = nkEngine() ;
        
        nkEnginePromise.then(
            function (nkEngine)
            {
                // Gather components we need
                nkImages = nkEngine.nkImages ;
                nkResources = nkEngine.nkResources ;

                nkEngineResolved = true ;
            }
        ) ;
    }
    else if (data._type == WORK_TYPE.PARSE_IMAGE)
        scheduleWork(parseImage, data) ;
}

// Logic
scheduleWork = function (callback, data)
{
    // Check if Nilkins is ready or not
    if (nkEngineResolved)
        callback(data) ;
    else
        nkEnginePromise.then(function () {callback(data) ;}) ;
}

parseImage = function (data)
{
    // Load path
    nkResources.ResourceManager.getInstance().loadFileIntoMemory(data._path).then(
        function (imgData)
        {
            // Check if can parse
            if (!nkImages.CompositeEncoder.canDecode(imgData))
            {
                // Stop here
                postMessage({_success : false, _error : "URL's file cannot be parsed as an image : " + data._path}) ;
                return ;
            }

            // Prepare image for texture assignment
            let imgAlignmentDesc = new nkImages.AlignmentDescriptor () ;
            imgAlignmentDesc._forceRgbFormat = true ;
            imgAlignmentDesc._alphaMode = nkImages.ALPHA_MODE.ALPHA ;
            let img = nkImages.CompositeEncoder.decode(imgData, imgAlignmentDesc) ;

            // Post it back
            //console.log(img.getDataBuffer().getData().slice(0)) ;
            const imgDataBuffer = img.getDataBuffer().getData().slice(0) ;
            postMessage({_index : data._index, _success : true, _width : img.getWidth(), _height : img.getHeight(), _data : imgDataBuffer}) ;

            // Delete the Cpp object for now
            img.delete() ;
        }
    ) ;
}