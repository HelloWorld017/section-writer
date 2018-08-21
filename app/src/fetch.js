export default async function request(location, args, method) {
	const request = {
		method: 'GET',
		headers: {

		}
	};

	if(request.token) {
		request.headers.Authorization = `Basic ${btoa('user:' + request.token)}`;
	}

	if(args) {
		request.method = 'POST';
		request.headers['Content-Type'] = 'application/json';
		request.body = JSON.stringify(args);
	}

	if(method) {
		request.method = method;
	}

	const result = await fetch(location, request).then(v => v.json());

	if(result.status !== 'ok') {
		throw new Error(result.error);
	}

	return result.result;
}
