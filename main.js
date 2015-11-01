var restify = require('restify')
var MongoClient = require('mongodb').MongoClient;
var _ = require('underscore');

var mongoDbAddr = 'localhost';
var bot_name = 'companiesbot';

/**
 * Fetches scraped companies from MongoDB.
 */
function sendScrapedCompanies(response) {
	var url = 'mongodb://' + mongoDbAddr + ':27017/scraping_companies';
	MongoClient.connect(url, function (err, db) {
		if (err) {
			var errMsg = 'Failed to connect to MongoDB';
			response.send(formatSlackText(errMsg));
			return;
		}

		var cursor = db.collection('companies').find();
		cursor.toArray(function(err, companies) {
			if (err) {
				var errMsg = 'Failed to fetch data from MongodB';
				response.send(formatSlackText(errMsg));
				return;
			}

			var allCompanies = 'Companies I\'ve scraped so far:\n';
			_.each(companies, function(company) {
				allCompanies += company.company + ' - ' +
					company.link + '\n';
			});

			response.send(formatSlackText(allCompanies));

			db.close();
		});
	});
}

function sendHelp(response) {
	var text = 'Every command starts with `' + bot_name +
		'` keyword. E.g.: \n' +
		'> ' + bot_name + ' show companies\n' +
		'All commands:\n' +
		'\t`help` - shows these help messages.\n' +
		'\t`show companies` - shows scraped companies.';
	var json = formatSlackText(text);
	response.send(json);
}

function onCmdShow(cmd, response) {
	if (cmd.args[0] == 'companies') {
		sendScrapedCompanies(response);
	}
}

function onCommand(cmd, response) {
	if (cmd.name == 'help') {
		sendHelp(response);
	} else if (cmd.name == 'show') {
		onCmdShow(cmd, response);
	}
}

function formatSlackText(text) {
	return { "text": text };
}

function onPost(req, res, next) {
	if (!hasBotCommand(req.params)) {
		onRequestError(req);
	} else {
		var cmd = getBotCommand(req.params.text);
		onCommand(cmd, res);
	}

	next();
}

function hasBotCommand(requestParams) {
	return 'text' in requestParams;
}

function getBotCommand(text) {
	var words = text.split(' ');
	var cmdArgs = undefined;
	if (words.length > 2) {
		cmdArgs = words.slice(2);
	}

	return { name: words[1], args: cmdArgs};
}

function onRequestError(request, response) {
	var errMsg = 'Bad POST request';
	response.send(errMsg);
}

function main() {
	var server = restify.createServer({
		name: 'stackoverflow-careers-bot',
		version: '0.1.0',
	});
	server.use(restify.bodyParser({ mapParams: true }));

	server.post('/', onPost);

	server.listen(8080, function() {
		console.log('%s listening at %s', server.name, server.url);
	});
}

main();
