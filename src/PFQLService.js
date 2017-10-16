'use strict'

let PFQLCore = require('./PFQLCore.js')

module.exports =
/**
 * Class of Protein Feature Query Language
 *
 * Service to process a given domain
 * architecture and verify its matches
 * against N rules
 *
 * */
class PFQLService {
	constructor(query = false) {
		this.query = query
		this.parsedSetsOfRules = []
	}

	/**
	 * Initiates the Service
	 */
	initRules() {
		if (this.query) {
			this.resources = [...Array(this.query.length).keys()].map((i) => [])
			this.query.forEach((setsOfRules, ruleIndex) => {
				let parsedRules = []
				setsOfRules.forEach((rules) => {
					this._isValidRule(rules)
					parsedRules.push(this._parseRules(rules, ruleIndex))
				})
				this.parsedSetsOfRules.push(parsedRules)
			})
		}
		else {
			throw new Error('No rules have been passed in the constructor')
		}
	}

	findMatches(item) {
		let newItem = JSON.parse(JSON.stringify(item))
		let matchList = []
		this.parsedSetsOfRules.forEach((parsedRules, ruleIndex) => {
			let DAarrayInfo = this._processFeaturesInfo(newItem, ruleIndex),
				DAstringInfo = DAarrayInfo.join('')
			let isMatch = false,
				newMatch = true
			parsedRules.forEach((parsedRule) => {
				newMatch = true
				if (parsedRule.pos !== null)
					newMatch = this._testPos(DAarrayInfo, parsedRule.pos)
				if ('Npos' in parsedRule)
					newMatch = newMatch && this._testNpos(DAstringInfo, parsedRule.Npos)
				isMatch = isMatch || newMatch
			})
			if (isMatch)
				matchList.push(ruleIndex)
		})
		newItem.PFQLMatches = matchList
		return newItem
	}

	_testNpos(stringInfo, rules) {
		let match = true
		if (rules) {
			rules.forEach((rule) => {
				if (rule[1] === '') {
					match = match && stringInfo.indexOf(rule[0]) !== -1
				}
				else {
					let interval = rule[1].match('{([^}]+)}')[1].split(',')
					if (interval.length > 1) {
						if (interval[1] === '')
							interval[1] = Number.MAX_SAFE_INTEGER
						match = match && (stringInfo.split(rule[0]).length - 1 >= parseInt(interval[0]) && (stringInfo.split(rule[0]).length - 1 <= parseInt(interval[1])))
					}
					else {
						match = match && stringInfo.split(rule[0]).length - 1 === parseInt(interval[0])
					}
				}
			})
		}
		return match
	}

	/**
	 * Test if the domain architecture of a sequence matches the filter.
	 * @param {string} arrayInfo - domain architecture information in string.
	 * @param {Object} parsedRules - Object containing the rules
	 * @returns {Boolean} - True if matches
	 */
	_testPos(arrayInfo, parsedRules) {
		let indexLastMatch = NaN,
			isOk = true

		for (let i = 0; i < parsedRules.rules.length; i++) { // check each rule
			let currRule = new PFQLCore({instructions: parsedRules.rules[i], pos: i}),
				nextRule = new PFQLCore({instructions: parsedRules.rules[i + 1], pos: i + 1}),
				classifiedMatches = {hard: [], soft: [], next: []}

			currRule.findMatches(arrayInfo, indexLastMatch)
			isOk = currRule.isOk

			if (indexLastMatch && (currRule.matches[0] - 1 !== indexLastMatch))
				isOk = false

			if (nextRule.instructions && currRule.matches.length !== 0) {
				if (isNaN(indexLastMatch))
					nextRule.findMatches(arrayInfo, 0)
				else
					nextRule.findMatches(arrayInfo, indexLastMatch + 1)

				classifiedMatches = this._classifyMatches(currRule, nextRule)


				let foundMatch = false

				for (let j = 0; j < classifiedMatches.soft.length + 1; j++) {
					currRule.isOk = true
					currRule.matches = classifiedMatches.hard.concat(classifiedMatches.soft.slice(0, j))
					nextRule.matches = classifiedMatches.soft.slice(j, classifiedMatches.soft.length).concat(classifiedMatches.next)


					if (currRule.pos === 0) {
						currRule.checkFirstRule(parsedRules.hardStart)
						// nextRule.checkFirstRule(parsedRules.hardStart)
					}
					else {
						currRule.checkNumMatches()
						nextRule.checkNumMatches(false)
					}
					if (currRule.isOk && nextRule.isOk) {
						// indexLastMatch = currRule.matches[currRule.matches.length - 1]
						foundMatch = true
						break
					}
				}
				if (foundMatch)
					isOk = true
			}


			if (!(currRule.checkFirstRule(parsedRules.hardStart))) {
				isOk = currRule.isOk
				break
			}

			if (!(currRule.checkNumMatches())) {
				isOk = currRule.isOk
				break
			}

			if (!(isNaN(indexLastMatch))) {
				if (isOk === false || currRule.matches === [] || currRule.matches[0] - 1 !== indexLastMatch) {
					isOk = false
					break
				}
			}
			indexLastMatch = currRule.matches[currRule.matches.length - 1]
			if (parsedRules.hardStop === true && i === parsedRules.rules.length - 1) {
				if (indexLastMatch !== arrayInfo.length - 1)
					isOk = false
			}

			if (isOk === false)
				break
		}
		return isOk
	}

	/**
	 * Classify matches into hard and soft matches.
	 * @param {PFQLCore} currRule - Current Rule
	 * @param {PFQLCore} nextRule - Next rule
	 * @returns {Object} { hard: [], soft: []}
	 */

	_classifyMatches(currRule, nextRule) {
		let hard = [],
			soft = [],
			next = []

		for (let i = 0; i < currRule.matches.length; i++) {
			if (nextRule.matches.indexOf(currRule.matches[i]) === -1)
				hard.push(currRule.matches[i])
			else
				soft.push(currRule.matches[i])
		}
		for (let i = 0; i < nextRule.matches.length; i++) {
			if (soft.indexOf(nextRule.matches[i]) === -1)
				next.push(nextRule.matches[i])
		}
		hard = this._cleanMatches(hard)
		soft = this._cleanMatches(soft)
		next = this._cleanMatches(next)
		return {
			hard,
			soft,
			next
		}
	}

	_cleanMatches(matches) {
		let newMatches = []
		matches.forEach(function(match) {
			if (newMatches.length === 0)
				newMatches.push(match)
			else if (match === newMatches[newMatches.length - 1] + 1)
				newMatches.push(match)
		})
		return newMatches
	}

	/**
	 * Add resource from rule to the array of resource used
	 * @param {string} resource
	 * @param {int} ruleIndex
	 * @returns {null}
	 */
	_addResources(resource, ruleIndex) {
		if (this.resources[ruleIndex].indexOf(resource) === -1)
			this.resources[ruleIndex].push(resource)
		return null
	}

	/**
	 * Parse filtering rules passed by the user
	 * @param {Object} rules - Raw rules object passed to FQL
	 * @param {int} ruleIndex
	 * @returns {Object} parsed - Same object but with the rules parsed
	 */
	_parseRules(rules, ruleIndex) {
		let parsed = {
			pos: this._parsePosRules(rules.pos, ruleIndex),
			Npos: this._parseNPosRules(rules.Npos, ruleIndex)
		}
		return parsed
	}

	/**
	 * Parse pos type of rules. It will also populate the this.resources with the resources found here.
	 * @param {Object} rules - Rule of Npos type object
	 * @param {int} ruleIndex
	 * @returns {Array.<Array>} regex - Array of [ String to match the domain architecture of sequences, string of interval of how many times it should appear ].
	 */
	_parseNPosRules(rules, ruleIndex) {
		let parsedNposRule = []
		if (rules) {
			let expr = ''
			let count = ''
			rules.forEach((rule) => {
				if (rule.feature === '.*')
					rule.feature = ''
				expr = rule.feature + '@' + rule.resource
				if ('count' in rule)
					count = rule.count
				parsedNposRule.push([expr, count])
				this._addResources(rule.resource, ruleIndex)
			})
		}
		else {
			parsedNposRule = null
		}
		return parsedNposRule
	}

	/**
	 * Parse pos type of rules.
	 * @param {Object} rules - Rule type obejct
	 * @param {int} ruleIndex
	 * @returns {Object} Object with instructions for positional matching. There are three values:
	 * 	hardStart {Boolean} - true if matters that first rule match first info.
	 * rules {Object} - Array with rules
	 * hardStop {Boolean} - true if matters that the last rule match last info.
	 */
	_parsePosRules(rules, ruleIndex) {
		let parsedRule = {
			hardStart: false,
			rules: [],
			hardStop: false
		}

		if (rules) {
			let expr = '',
				instructions = []
			rules.forEach((rule, i) => {
				if (rule.constructor === Object)
					instructions = [rule]
				else
					instructions = rule
				let parsed = []
				instructions.forEach((instr) => {
					expr = this._parseThePosInstruction(instr, i, rules.length, ruleIndex)
					if (expr === 'hardStart')
						parsedRule.hardStart = true
					else if (expr === 'hardStop')
						parsedRule.hardStop = true
					else
						parsed.push(expr)
				})
				if (parsed.length !== 0)
					parsedRule.rules.push(parsed)
			})
		}
		else {
			parsedRule = null
		}
		if (parsedRule && parsedRule.hardStart === true && parsedRule.hardStop === true) {
			for (let i = 0; i < parsedRule.rules.length; i++) {
				for (let j = 0; j < parsedRule.rules[i].length; j++) {
					if (isNaN(parsedRule.rules[i][j][1][1]))
						parsedRule.rules[i][j][1][1] = 1
				}
			}
		}
		return parsedRule
	}

	/**
	 * Loop to parse individual rules
	 * @param {Object} rule - Instruction to be parsed.
	 * @param {number} i - index of the rule
	 * @param {number} L - number of rules.
	 * @param {int} ruleIndex
	 * @returns {Object.Array|string} Parsed rule or
 	 */
	_parseThePosInstruction(rule, i, L, ruleIndex) {
		let interval = [1, NaN],
			expr = ''
		if (rule.resource === 'fql') {
			if (rule.feature === '^' && i === 0)
				expr = 'hardStart'
			if (rule.feature === '$' && i === L - 1)
				expr = 'hardStop'
		}
		else {
			this._addResources(rule.resource, ruleIndex)
			if ('count' in rule)
				interval = this._parseCount(rule.count)
			expr = [rule.feature + '@' + rule.resource, interval]
		}
		return expr
	}


	/**
	 * Parse RegEx-like repeat info.
	 * @param {string} countString - RegEx formated count string
	 * @returns {Object} Returns an array (lentgh 2) with the interval to be used. Infinity is used in the second item in case a 'at least` statement is passed. Ex.: {3,} - at least 3.
	 */
	_parseCount(countString) {
		let toBeParsed = countString
			.replace('{', '')
			.replace('}', '')
			.split(','),
			intervalMaxLength = 2,
			interval = []
		if (toBeParsed.length > intervalMaxLength)
			throw new Error('Invalid count value (too many commas): ' + countString)
		toBeParsed.forEach((n, i) => {
			if (n.match(/^\d+$/))
				interval.push(parseInt(n))
			else if (n === '' && i !== 0)
				interval.push(Infinity)
			else if (n === '' && i === 0)
				interval.push(0)
			else
				throw new Error('Invalid count value (only integers): ' + countString)
		})
		if (interval.length === 1)
			interval.push(interval[0])
		return interval
	}

	/**
	 * Parse SeqDepot type of domain architecture response.
	 * @param {string} info - SeqDepot-formated feature information
	 * @param {int} ruleIndex
	 * @returns {Object} Returns an array with features information formated as: feature@resource
	 */
	_processFeaturesInfo(info, ruleIndex) {
		let features = []
		this.resources[ruleIndex].forEach((resource) => {
			if ('t' in info) {
				if (resource in info.t) {
					info.t[resource].forEach((hit) => {
						let feature = {}
						feature.rc = resource
						feature.ft = hit[0]
						feature.pos = hit[1]
						features.push(feature)
					})
				}
			}
		})
		features.sort((a, b) => {
			return a.pos - b.pos
		})
		let expressions = []
		features.forEach((feature) => {
			expressions.push(feature.ft + '@' + feature.rc)
		})
		return expressions
	}

	/**
	 * Validates rules passed by user
	 * @param {Object} rule - Pass the object with Npos and pos rules
	 * @throws {Error} If rule is missing feature, resource or both
	 * @returns {Null}
	 */

	_isValidRule(rule) {
		if ('pos' in rule) {
			rule.pos.forEach((posRules) => {
				let posRulesFixed = posRules
				if (posRules.constructor === Object)
					posRulesFixed = [posRules]

				posRulesFixed.forEach((posRule) => {
					let noResource = true,
						noFeature = true

					let values = Object.keys(posRule).map((key) => posRule[key])
					values.forEach((value) => {
						if (value === '*')
							throw new Error('Wrong wild card. Change "*" to ".*" in:\n' + JSON.stringify(posRule))
					})


					if ('resource' in posRule)
						noResource = false
					if ('feature' in posRule)
						noFeature = false

					if (noResource && noFeature)
						throw new Error('Each pos rule must explicitly define a resource and feature: \n' + JSON.stringify(posRule))
					else if (noResource)
						throw new Error('Each pos rule must explicitly define a resource: \n' + JSON.stringify(posRule))
					else if (noFeature)
						throw new Error('Each pos rule must explicitly define a feature: \n' + JSON.stringify(posRule))
				})
			})
		}
		if ('Npos' in rule) {
			rule.Npos.forEach((nposRule) => {
				let noResource = true,
					noFeature = true

				let values = Object.keys(nposRule).map((key) => nposRule[key])
				values.forEach((value) => {
					if (value === '*')
						throw new Error('Wrong wild card. Change "*" to ".*" in:\n' + JSON.stringify(nposRule))
				})

				if ('resource' in nposRule)
					noResource = false
				if ('feature' in nposRule)
					noFeature = false

				if (noResource && noFeature)
					throw new Error('Each Npos rule must explicitly define a resource and feature: \n' + JSON.stringify(nposRule))
				else if (noResource)
					throw new Error('Each Npos rule must explicitly define a resource: \n' + JSON.stringify(nposRule))
				else if (noFeature)
					throw new Error('Each Npos rule must explicitly define a feature: \n' + JSON.stringify(nposRule))
			})
		}
		return null
	}
}
