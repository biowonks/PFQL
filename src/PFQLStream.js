'use strict'

let PFQLService = require('./PFQLService.js'),
	Transform = require('stream').Transform,
	bunyan = require('bunyan')

let progressReportNumber = 1000

module.exports =
/**
 * Class of Feature Query Language
 * */
class PFQLStream extends Transform {
	constructor(setsOfRules) {
		super({objectMode: true})
		this.setsOfRules = setsOfRules
		this.log = bunyan.createLogger({name: 'PFQLStream'})
		this.log.info('start')
		this.numItems = 0
		this.progressReportNumber = progressReportNumber
		this.pfqlService = new PFQLService(this.setsOfRules)
		this.pfqlService.initRules()
	}

	_transform(chunk, enc, next) {
		this.numItems++
		if (this.numItems % this.progressReportNumber === 0)
			this.log.info(this.numItems + ' have been processed')
		this.push(this.pfqlService.findMatches(chunk))
	}
}
