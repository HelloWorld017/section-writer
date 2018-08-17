const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const http = require("http");
const logger = require("morgan");
const path = require("path");
const rimraf = require('rimraf');
const {promisify} = require("util");
const simpleGit = require('simple-git/promise');


const port = ((val) => {
	let port = parseInt(val, 10);

	if(isNaN(port)) return val;
	if(port >= 0) return port;
	return false;
})(process.env.PORT || '3000');

const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const read = file => promisify(fs.readFile)(file, 'utf8');
const write = promisify(fs.writeFile);
const rmdir = promisify(rimraf);
const unlink = promisify(fs.unlink);

(async () => {
	let config = {
		token: {
			user: Math.random().toString(36).slice(2)
		},

		trustProxy: true
	};

	const git = simpleGit(path.resolve('./contents'));

	try {
		config = JSON.parse(await read(path.resolve(__dirname, 'config.json')));
	} catch(e) {
		await write('./config.json', JSON.stringify(config, null, '\t'));
		console.log("새 설정을 생성했습니다. 비밀번호를 변경해주세요!");
	}

	const app = express();

	app.set('port', port);

	app.use(logger('dev'));

	app.use('/dist', express.static('./dist/'));

	app.get('/', (req, res) => {
		res.status(200).sendFile(path.resolve('app', './index.html'));
	});

	app.use((req, res, next) => {
		let ip = req.connection.remoteAddress;
		if(config.trustProxy && req.headers['x-forwarded-for']) ip = req.headers['x-forwarded-for'];

		if(ip.startsWith('127.') || ip.startsWith('192.168.') || ip === '::1') {
			next();
			return;
		}

		try {
			const token = req.headers['authorization'].split(' ');
			const authType = token[0];
			const decodedAuth = Buffer.from(token[1], 'base64').toString().split(':');
			const authName = decodedAuth[0];
			const authPass = decodedAuth[1];

			if(authType === 'Basic' && authName === 'user' && authPass === config.token.user) {
				next();
				return;
			}
		} catch(e) {}

		res.status(403).json({
			status: 'failed',
			authenticated: false,
			error: "Not authenticated"
		});
	});

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: false
	}));

	const handle = method => (path, handler) => app[method](path, async (...args) => {
		const res = args[1];

		let result = {status: 'ok'};
		let returnVal;
		try {
			returnVal = await handler(...args);
		} catch(e) {
			res.status(500).json({
				status: 'failed',
				error: e.toString()
			});
			return;
		}

		if(returnVal !== undefined) {
			result.result = returnVal;
		}

		res.status(200).json(result);
	});

	const eget = handle('get');
	const epost = handle('post');
	const edelete = handle('delete');

	const commitChange = async (text) => {
		await git.add('.');
		await git.commit(text || `Update ${Date.now()}`);
	};

	eget('/auth', async () => {});

	eget('/sects', async (req, res) => {
		const sectList = await readdir(path.resolve('./contents'));
		return sectList.filter(v => !v.startsWith('.'));
	});

	epost('/sects', async (req, res) => {
		const id = `${Date.now()}`;
		const descriptor = {
			id,
			title: req.body.title,
			pages: [],
			visible: true
		};

		await mkdir(path.resolve('./contents', id));
		await write(path.resolve('./contents', id, 'info.json'), JSON.stringify(descriptor, null, '\t'));
		await commitChange(`New sect: ${req.body.title}`);

		return descriptor;
	});

	eget('/sect/:sectId/', async (req, res) => {
		const safeId = req.params.sectId.replace(/[^0-9]/, '');
		return JSON.parse(await read(path.resolve('./contents', safeId, 'info.json')));
	});

	epost('/sect/:sectId/', async (req, res) => {
		const safeId = req.params.sectId.replace(/[^0-9]/, '');
		await write(path.resolve('./contents', safeId, 'info.json'), req.body.descriptor);
		await commitChange(`Updated sect info: ${safeId}`);
	});

	edelete('/sect/:sectId/', async(req, res) => {
		const safeId = req.params.sectId.replace(/[^0-9]/, '');
		await rmdir(path.resolve('./contents', safeId));
		await commitChange(`Deleted sect: ${safeId}`);
	});

	epost('/sect/:sectId/pages', async (req, res) => {
		const safeSectId = req.params.sectId.replace(/[^0-9]/, '');
		const sectConfig = JSON.parse(await read(path.resolve('./contents', safeSectId, 'info.json')));
		const id = `${Date.now()}`;

		const descriptor = {
			id,
			title: req.body.title,
			visible: true
		};

		sectConfig.pages.push(id);

		await write(path.resolve('./contents', safeSectId, `info.json`), JSON.stringify(sectConfig, null, '\t'));
		await write(path.resolve('./contents', safeSectId, `${id}.json`), JSON.stringify(descriptor, null, '\t'));
		await write(path.resolve('./contents', safeSectId, `${id}.txt`), '');
		await commitChange(`New page: ${req.body.title}`);

		return descriptor;
	});

	eget('/sect/:sectId/page/:pageId', async (req, res) => {
		const safeSectId = req.params.sectId.replace(/[^0-9]/, '');
		const safePageId = req.params.pageId.replace(/[^0-9]/, '');
		const descriptor = JSON.parse(await read(path.resolve('./contents', safeSectId, `${safePageId}.json`)));
		const content = await read(path.resolve('./contents', safeSectId, `${safePageId}.txt`));

		return {
			descriptor,
			content
		};
	});

	epost('/sect/:sectId/page/:pageId', async (req, res) => {
		const safeSectId = req.params.sectId.replace(/[^0-9]/, '');
		const safePageId = req.params.pageId.replace(/[^0-9]/, '');

		if(req.body.descriptor) {
			await write(path.resolve('./contents', safeSectId, `${safePageId}.json`), req.body.descriptor);
		}

		if(req.body.content) {
			await write(path.resolve('./contents', safeSectId, `${safePageId}.txt`), req.body.content);
		}

		await commitChange(`Updated page: ${safePageId}`);
	});

	edelete('/sect/:sectId/page/:pageId', async(req, res) => {
		const safeSectId = req.params.sectId.replace(/[^0-9]/, '');
		const safePageId = req.params.pageId.replace(/[^0-9]/, '');
		const sectConfig = JSON.parse(await read(path.resolve('./contents', safeSectId, 'info.json')));
		sectConfig.pages = sectConfig.pages.filter(v => v !== safePageId);

		await write(path.resolve('./contents', safeSectId, `info.json`), JSON.stringify(sectConfig, null, '\t'));
		await unlink(path.resolve('./contents', safeSectId, `${safePageId}.json`));
		await unlink(path.resolve('./contents', safeSectId, `${safePageId}.txt`));
		await commitChange(`Deleted page: ${safePageId}`);
	});

	const server = http.createServer(app);

	server.listen(port);
	server.on('error', (error) => {
		if(error.syscall !== 'listen') throw error;

		let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

		switch(error.code){
			case 'EACCES':
				console.error(bind + ' requires elevated privileges');
				process.exit(1);
				break;
			case 'EADDRINUSE':
				console.error(bind + ' is already in use');
				process.exit(1);
				break;
			default:
				throw error;
		}
	});

	server.on('listening', () => {
		let addr = server.address();
		let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
		console.log('Listening on ' + bind);
	});
})();
