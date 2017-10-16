'use strict'

module.exports =
/**
 * Object related to single instruction
 *
 * @constructor
 * @param {string?} optSequence defauls to the empty string
 */
class PFQLCore {
	constructor(rule = {rule: [], pos: -1}) {
		if (rule.instructions)
			this.instructions = rule.instructions
		else
			this.instructions = []

		this.pos = rule.pos

		this.matches = []
		this.lowNumMatches = []
		this.highNumMatches = []
		this.isOk = true


		this.numOfIns = this.instructions.length
	}

	/**
	 * Find if certain rule will match the expression. (NEED TEST)
	 * @param {Object.Array} arrayInfo - Array containing the features of sequence.
	 * @param {number} startPos - Index where it will start looking for matches in the arrayInfo.
	 * @return {Array} Returns array of index that matches all instructions in the self set.
	 */

	findMatches(arrayInfo, startPos = NaN) {
		let matchArchive = [],
			isOk = true,
			commonMatches = [],
			lowNumMatches = [],
			highNumMatches = []


		for (let j = 0; j < this.numOfIns; j++) {
			let instr = this.instructions[j],
				matches = []

			lowNumMatches.push(instr[1][0])
			highNumMatches.push(instr[1][1])

			let negative = false
			if (highNumMatches[j] === 0 && lowNumMatches[j] === 0)
				negative = true


			for (let k = (startPos + 1 ? startPos + 1 : 0); k < arrayInfo.length; k++) {
				if (arrayInfo[k].match(instr[0]) && !(negative)) {
					if (matches.length === 0 || matches[matches.length - 1] === k - 1)
						matches.push(k)
					else
						break
				}
				else if (!(arrayInfo[k].match(instr[0])) && negative) {
					matches.push(k)
				}
			}


			if (instr[0].indexOf('.*') !== -1)
				matches.splice(highNumMatches[j])


			matchArchive.push({matches, negative})
			this.matches = matches
		}

		if (this.instructions.length > 1) {
			commonMatches = this._findCommonMatches(matchArchive)
			this.matches = commonMatches
		}
		this.lowNumMatches = lowNumMatches
		this.highNumMatches = highNumMatches
		this.isOk = isOk
	}

	/**
	 * Find the index of the last feature in the sequence to match a positional instruction.
	 * @param {Array.Object} matchArchive - Array containing the object of matches and isOk for each rule.
	 * @returns {Array} Return a list of match index common to all instructions in the rule.
	 */
	_findCommonMatches(matchArchive) {
		let listOfMatches = []
		for (let i = 0; i < matchArchive.length; i++)
			listOfMatches.push(matchArchive[i].matches)

		listOfMatches.sort((a, b) => {
			return a.length < b.length
		})
		if (listOfMatches.length === 0)
			return []

		let common = []
		if (listOfMatches.length > 1) {
			for (let i = 0; i < listOfMatches.length - 1; i++) {
				for (let j = 0; j < listOfMatches[i].length; j++) {
					let newValue = listOfMatches[i][j],
						numOfIns = 0
					for (let k = i + 1; k < listOfMatches.length; k++) {
						if (listOfMatches[k].indexOf(newValue) !== -1 || (listOfMatches[k].length === 0))
							numOfIns++
					}
					if (numOfIns + 1 === listOfMatches.length)
						common.push(newValue)
				}
			}
		}
		else if (listOfMatches.length === 1) {
			common = listOfMatches[0]
		}
		return common
	}

	checkFirstRule(hardStart) {
		if (hardStart === true && this.pos === 0) {
			let first = this.matches[0]
			if (first !== 0 || this.matches.length < this.lowNumMatches || this.matches.length > this.highNumMatches)
				this.isOk = false
		}
		return this.isOk
	}

	checkNumMatches(checkHigh = true) {
		for (let i = 0; i < this.numOfIns; i++) {
			if (this.lowNumMatches[i] !== 0 && this.highNumMatches !== 0) {
				if (this.matches.length < this.lowNumMatches[i] || (this.instructions[0].indexOf('.*') === -1 && this.matches.length > this.highNumMatches[i] && checkHigh) || this.isOk === false)
					this.isOk = false
			}
		}
		return this.isOk
	}
}
