<template>
	<main class="App List">
		<sect
			v-for="sect in sects"
			:key="sect" :id="sect"
			@remove="remove(sect)">

		</sect>

		<section class="Sect Sect--add"  v-ripple="'rgba(0, 0, 0, .1)'" @click="newSect()">
			<i class="mdi mdi-plus"></i>
		</section>
	</main>
</template>

<style scoped>
	.App {
		background: #f1f2f3;
		width: 100%;
		min-height: 100vh;
		position: absolute;
	}
</style>

<style>
	body {
		margin: 0;
	}
</style>

<script>
	import Sect from "./Sect.vue";
	import request from "../src/fetch";

	export default {
		data() {
			return {
				sects: []
			};
		},

		methods: {
			askToken() {
				request.token = prompt("Please enter your token");
			},

			async newSect() {
				const {id} = await request(`/sects`, {title: 'Untitled Sect'});
				this.sects.push(id);
			},

			async remove(id) {

			},

			async save() {
				for(let sect of this.$children) {
					await sect.save();
				}
			},

			async fetchSects() {
				this.sects = await request('/sects');
			}
		},

		async mounted() {
			try {
				await request('/auth');
			} catch(e) {
				this.askToken();
			}

			await this.fetchSects();

			document.addEventListener('keydown', ev => {
				if(ev.key === 's' && ev.ctrlKey) {
					this.save();
					ev.preventDefault();
				}
			});
		},

		components: {
			Sect
		}
	};
</script>
