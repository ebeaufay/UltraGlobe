'use strict'

import * as epsg from 'epsg-index/all.json';
import * as proj4 from 'proj4';

const leadingEPSG = /^epsg:/i

const transform = (from, to) => {
	if ('string' !== typeof from) throw new Error('from must be a string')
	from = from.replace(leadingEPSG, '')
	const fromEPSG = epsg[from]
	if (!fromEPSG) throw new Error(from + ' is not a valid EPSG coordinate system')

	if ('string' !== typeof to) throw new Error('to must be a string')
	to = to.replace(leadingEPSG, '')
	const toEPSG = epsg[to]
	if (!toEPSG) throw new Error(to + ' is not a valid EPSG coordinate system')

	return proj4.default(fromEPSG.proj4, toEPSG.proj4)
}

export {transform}
