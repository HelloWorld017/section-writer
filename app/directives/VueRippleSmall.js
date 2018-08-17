class RippleHandler {
	constructor(elem) {
		this.elem = elem;
		elem.classList.add('Rippler');
		elem.addEventListener('mousedown', () => this.addRipple());

		this.ripples = {};
		this.maxId = 0;
	}

	addRipple() {
		this.ripples[this.maxId] = new RippleSmall(this, this.maxId);
		this.maxId++;
	}

	remove(id) {
		delete this.ripples[id];
	}
}

class RippleSmall {
	constructor(handler, id) {
		this.handler = handler;
		this.id = id;
		this.start = Date.now();
		this.removed = false;
		this.elem = handler.elem;
		this.init();

		const _this = this;
		this.elem.addEventListener('mouseup', function clear() {
			setTimeout(() => _this.clearRipple(), 300);
			_this.elem.removeEventListener('mouseup', clear);
		});

	}

	init() {
		this.rippler = document.createElement('div');
		this.rippler.classList.add('Rippler__ripple', 'Rippler__ripple--active');
		this.elem.appendChild(this.rippler);
	}

	clearRipple() {
		if(this.removed) return;
		this.removed = true;

		this.rippler.classList.remove('Rippler__ripple--active');
		this.rippler.classList.add('Rippler__ripple--clear');

		setTimeout(() => {
			this.elem.removeChild(this.rippler);
			this.handler.remove(this.id);
		}, 400);
	}
}

export default {
	bind(elem) {
		new RippleHandler(elem);
	}
};
