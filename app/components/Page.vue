<template>
	<div class="Page">
		<template  v-if="descriptor">
			<header class="Page__header">
				<label>
					<input type="text" class="Page__title" v-model="descriptor.title" @blur="updateTitle">
					<span></span>
				</label>

				<div class="Page__tools">
					<div class="Page__tags" v-if="descriptor.tags">
						<span v-for="tag in descriptor.tags" class="Page__tag">{{tag}}</span>
					</div>

					<span class="Page__counter">
						{{length}}
						<span v-if="!saved">*</span>
					</span>

					<i class="mdi mdi-backburger" @click="moveTo()" v-ripple-small></i>
					<i class="mdi mdi-delete-variant" @click="remove()" v-ripple-small></i>
					<i class="mdi mdi-chevron-up" @click="moveUp()" v-ripple-small></i>
					<i class="mdi mdi-chevron-down" @click="moveDown()" v-ripple-small></i>

					<div class="Page__visibility">
						<i class="mdi Rippler"
							:class="descriptor.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
							@click="setVisible(!descriptor.visible)"
							v-ripple-small>

						</i>
					</div>
				</div>
			</header>

			<transition :css="false"
				@before-enter="resizeBeforeEnter"
				@after-enter="resizeAterEnter"
				@before-leave="resizeBeforeLeave"
				@leave="resizeAfterLeave">

				<div class="Page__content__wrapper" v-if="descriptor.visible">
					<textarea class="Page__content" ref="editor" v-model="content"></textarea>
				</div>
			</transition>
		</template>
	</div>
</template>

<style lang="less">
	.Page {
		margin: 20px;
		font-family: 'Noto Sans CJK KR', sans-serif;
		font-size: 1.1rem;

		&--add {
			display: flex;
			justify-content: center;
			align-items: center;
			cursor: pointer;
			min-height: 100px;
			background: #e3e4e5;

			i {
				font-size: 2rem;
			}
		}

		&__header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 10px 40px;
			box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .3);
			background: #fff;
		}

		&__tools {
			display: flex;
			align-items: center;
			font-family: inherit;

			*:not(:last-child) {
				margin-right: 20px;
			}

			i {
				cursor: pointer;
			}
		}

		&__tags {
			display: flex;
			align-items: center;
		}

		&__tag {
			background: #e1e2e3;
			padding: 3px;
			border-radius: 3px;
			font-size: 0.9rem;
			font-family: NanumGothicCoding, D2Coding, Fira Code, monospace;
		}

		&__content {
			width: 100%;
			border: none;
			resize: none;
			outline: none;
			box-sizing: border-box;
			font-family: inherit;
			background: #e3e4e5;
			padding: 20px;
			min-height: 150px;
			transform-origin: top;
			font-size: 1rem;

			&__wrapper {
				transition: max-height .4s ease;
			}
		}
	}
</style>

<script>
	import request from "../src/fetch";

	export default {
		data() {
			return {
				content: null,
				descriptor: null,
				height: 0,
				unsavedEdit: 0
			};
		},

		model: {
			prop: 'calcLen',
			event: 'edit'
		},

		props: {
			id: {
				type: String,
				required: true
			},

			sect: {
				type: Object,
				required: true
			},

			calcLen: Array
		},

		methods: {
			updateTitle() {
				this.saveDescriptor();
			},

			moveTo() {

			},

			moveUp() {
				const currentIndex = this.sect.pages.indexOf(this.id);
				if(currentIndex <= 0) return;

				const newPages = this.sect.pages.slice();
				newPages.splice(currentIndex, 1);
				newPages.splice(currentIndex - 1, 0, this.id);

				this.sect.pages = newPages;
				this.$emit('updateDescriptor');
			},

			moveDown() {
				const currentIndex = this.sect.pages.indexOf(this.id);
				if(currentIndex < 0 || currentIndex >= this.sect.pages.length - 1) return;

				const newPages = this.sect.pages.slice();
				newPages.splice(currentIndex, 1);
				newPages.splice(currentIndex + 1, 0, this.id);

				this.sect.pages = newPages;
				this.$emit('updateDescriptor');
			},

			async remove() {
				await request(`/sect/${this.sect.id}/page/${this.id}`, null, 'delete');
				this.$emit('refresh');
			},

			setVisible(visibility) {
				this.descriptor.visible = visibility;
				this.saveDescriptor();
				this.updateModel();
			},

			saveDescriptor() {
				request(`/sect/${this.sect.id}/page/${this.id}`, {descriptor: JSON.stringify(this.descriptor)});
			},

			async saveContent() {
				await request(`/sect/${this.sect.id}/page/${this.id}`, {content: this.content});
				this.unsavedEdit = 0;
			},

			save() {
				this.saveDescriptor();
				this.saveContent();
			},

			resizeBeforeEnter(el) {
				el.style.maxHeight = '0';
				el.style.transition = 'all .4s ease';
			},

			resizeAterEnter(el) {
				el.style.overflow = 'auto';
				setTimeout(() => {
					el.style.maxHeight = el.scrollHeight + 'px';
					el.style.overflow = 'hidden';
				}, 10);
				setTimeout(() => el.style.maxHeight = 'initial', 410);
			},

			resizeBeforeLeave(el) {
				el.style.transition = 'max-height .4s ease';
				el.style.maxHeight = el.scrollHeight + 'px';
			},

			resizeAfterLeave(el, done) {
				el.style.overflow = 'hidden';
				setTimeout(() => el.style.maxHeight = '0', 30);
				setTimeout(done, 430);
			},

			updateHeight() {
				if(!this.$refs.editor) return;
				this.$refs.editor.style.height = 0;
				this.$refs.editor.style.height = (12 + this.$refs.editor.scrollHeight) + "px";
			},

			updateModel() {
				this.$emit('edit', [this.descriptor.visible, this.length]);
			}
		},

		computed: {
			length() {
				return this.content.length;
			},

			saved() {
				return this.unsavedEdit === 0;
			}
		},

		watch: {
			content() {
				if(!this.$refs.editor) return;
				this.updateHeight();
				this.unsavedEdit++;

				if(this.unsavedEdit >= 30) {
					this.saveContent();
				}

				this.updateModel();
			}
		},

		async mounted() {
			const {descriptor, content} = await request(`/sect/${this.sect.id}/page/${this.id}`);

			this.content = content;
			this.descriptor = descriptor;

			this.$nextTick(() => {
				this.updateModel();
				this.updateHeight();
			});
		}
	};
</script>
