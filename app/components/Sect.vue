<template>
	<section class="Sect" v-if="sect">
		<header class="Sect__header" :style="{background: sect.color ? sect.color : ''}">
			<label>
				<input type="text" class="Sect__title" v-model="sect.title" @blur="updateTitle">
				<span></span>
			</label>

			<div class="Sect__tools">
				<span class="Sect__counter">
					{{count}} /
					<input type="number" class="Sect__counter" v-model="sect.maxLength" @blur="saveDescriptor">
				</span>

				<div class="Sect__visibility">
					<i class="mdi Rippler"
						:class="sect.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
						@click="setVisible(!sect.visible)"
						v-ripple-small>

					</i>
				</div>
			</div>
		</header>

		<div class="Sect__pages" v-show="sect.visible">
			<transition-group tag="div" ref="pages" name="fade-translate">
				<page v-for="page in sect.pages"
					:key="page"
					:id="page"
					:sect="sect"
					v-model="pageLens[page]"
					@updateDescriptor="saveDescriptor"
					@refresh="refresh">
				</page>

				<div class="Page Page--add" key="add" v-ripple="'rgba(0, 0, 0, .1)'" @click="newPage()">
					<i class="mdi mdi-plus"></i>
				</div>
			</transition-group>
		</div>
	</section>
</template>

<style lang="less">
	.Sect {
		margin: 30px auto;
		max-width: 768px;
		padding-bottom: 10px;
		background: #f8f9fa;
		font-family: 'NanumSquare', sans-serif;
		box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .3);

		&--add {
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: none;
			min-height: 200px;
			background: #e3e4e5;
			cursor: pointer;

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
			font-family: inherit;
		}

		&__counter {
			margin-right: 20px;
		}

		&__visibility {
			display: flex;
			align-items: center;

			i {
				cursor: pointer;
			}
		}
	}
</style>

<script>
	import Page from "./Page.vue";

	import request from "../src/fetch";

	export default {
		data() {
			return {
				sect: null,
				pageLens: {}
			};
		},

		props: {
			id: {
				type: String,
				required: true
			}
		},

		methods: {
			setVisible(visibility) {
				this.sect.visible = visibility;
				this.saveDescriptor();
			},

			updateTitle() {
				this.saveDescriptor();
			},

			async newPage() {
				const {id} = await request(`/sect/${this.id}/pages`, {title: 'Untitled Page'});
				this.sect.pages.push(id);
			},

			saveDescriptor() {
				request(`/sect/${this.id}/`, {descriptor: JSON.stringify(this.sect)});
			},

			async refresh() {
				this.sect = await request(`/sect/${this.id}`);
				Object.keys(this.pageLens).forEach(v => {
					if(!this.sect.pages.includes(v)) this.$delete(this.pageLens, v);
				});
			},

			async save() {
				for(let page of this.$refs.pages.$children) {
					if(!page.saved) await page.saveContent();
				}
			}
		},

		computed: {
			count() {
				return Object.keys(this.pageLens)
					.map(k => this.pageLens[k])
					.filter(v => v[0])
					.map(v => v[1])
					.filter(v => typeof v === 'number')
					.reduce((prev, curr) => prev + curr, 0);
			}
		},

		async mounted() {
			await this.refresh();
		},

		components: {
			Page
		}
	}
</script>
