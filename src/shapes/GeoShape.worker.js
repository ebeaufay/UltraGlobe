// worker.js

import { buildPolygonGeometry, buildPolylineGeometry, buildPointsGeometry, buildLonLatPolylineGeometry, buildLonLatPolygonGeometry } from "./GeoShapeUtils";



self.onmessage = function (e) {

    try {

        switch (e.data.method) {
            case "polygon":
                const polygonGeometry = buildPolygonGeometry(e.data.coordinates, e.data.maxSegmentLength, e.data.height, e.data.lineType)
                postMessage({ polygonGeometry }, [polygonGeometry.indices.buffer, polygonGeometry.positions.buffer])
                break
            case "polyline":
                const polylineGeometry = buildPolylineGeometry(e.data.coordinates, e.data.maxSegmentLength, e.data.height, e.data.lineType)
                postMessage({ polylineGeometry }, [polylineGeometry.positions.buffer])
                break
            case "point":
                const pointsGeometry = buildPointsGeometry(e.data.coordinates)
                postMessage({ pointsGeometry }, [pointsGeometry.positions.buffer])
                break

            case "lonLatPolyline":
                const lonLatPolylineGeometry = buildLonLatPolylineGeometry(e.data.coordinates, e.data.maxSegmentLength, e.data.lineType)
                postMessage({ lonLatPolylineGeometry }, [lonLatPolylineGeometry.positions.buffer])
                break
            case "lonLatPolygon":
                const lonLatPolygonGeometry = buildLonLatPolygonGeometry(e.data.coordinates, e.data.maxSegmentLength, e.data.lineType)
                postMessage({ lonLatPolygonGeometry }, [lonLatPolygonGeometry.indices.buffer, lonLatPolygonGeometry.positions.buffer])
                break
            default:
                throw new Error(`No method with name ${method}`)
        }
    } catch (error) {
        postMessage({ error: error.message })
    }
}

