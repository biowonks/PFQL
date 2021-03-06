/* eslint-disable no-magic-numbers, no-undefined */
'use strict'
let expect = require('chai').expect

let Stream = require('stream'),
	PFQLStream = require('./PFQLStream.js')

let sampleData = require('../test-data/PFQL-sample-input.json') // , {highWaterMark: 3 * 64 }),

describe('PFQLStream test suit ::', function() {
	it('has to work using stream', function() {
		let readable = new Stream.Readable({objectMode: true})
		sampleData.forEach((item) => {
			readable.push(item)
		})
		readable.push(null)

		let query = [
			{
				rules: [
					{
						pos: [
							{
								resource: 'pfam28',
								feature: 'CheW',
								count: '{2,3}'
							},
							{
								resource: 'fql',
								feature: '$'
							}
						]
					}
				]
			}
		]

		let expected = [
			[0], // CheW | CheW
			[], // CheW | Response_reg
			[], // CheW
			[], // Hpt | P2 | H-kinase_dim | HATPase_c | CheW
			[0], // Hpt | P2 | H-kinase_dim | HATPase_c | CheW | CheW
			[], // Hpt | P2 | H-kinase_dim | HATPase_c | CheW | Response_reg
			[0], // CheW | CheW | CheW
			[], // Response_reg | NMT1_2 | CheW
			[], // CheW | CheR
			[], // Response_reg | CheW
			[], // TM | Cache_1 | TM | HAMP | MCPsignal
			[], // HAMP | MCPsignal
			[], // PAS_9 | PAS | PAS_4 | PAS_3 | TM | TM | MCPsignal
			[], // **
			[], // **
			[], // TM | TM | MCPsignal
			[], // TM | MCPsignal | Rhodanese
			[], // TM | TM | TM | TM | MCPsignal
			[], // TM | TM | TM | TM | TM | TM | MCPsignal
			[],  // TM | Cache_2 | Cache_2 | TM | HAMP | MCPsignal
			[], // TM | Cache_2 | Cache_1 | TM | HAMP | MCPsignal
			[], // TM | Cache_1 | Cache_2 | TM | HAMP | MCPsignal
			[], // TM | Cache_1 | Cache_1 | TM | HAMP | MCPsignal
			[] // TM | Cache_2 | Cache_2 | Cache_2 | TM | HAMP | MCPsignal
		]

		let listOfData = []

		let pfqlStream = new PFQLStream(query)
		pfqlStream.initRules()
		pfqlStream.progressReportNumber = 1
		readable.pipe(pfqlStream)
			.on('data', function(item) {
				listOfData.push(item.FQLMatches)
			})
			.on('end', function() {
				expect(listOfData).eql(expected)
			})
	})
})
