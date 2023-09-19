let JSONSafe = {
	parse: function (data) {
		try {
			return JSON.parse(data);
		} catch (e) {
			console.error('JSON Parse Error: ', e);
			return {};
		}
	}
}

function objectEquality(collection, source) {
	for (i = 0; i < collection.length; i++) {
		for (let prop in source) {
			if (!collection[i].hasOwnProperty(prop)) {
				return false;
			}
		}
	}
	return true;
}

module.exports = {
	JSONSafe,
	objectEquality
}
