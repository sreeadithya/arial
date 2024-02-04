<script>
	import { auth, db, storage } from '../../../lib/firebase';
	import { ref, set, get, child, remove, update } from 'firebase/database';
	import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
	import { onAuthStateChanged } from 'firebase/auth';
	import { userDetails } from '../../../lib/store';
	import { onMount } from 'svelte';

	let userFirebaseConfigRaw;
	let showLoggedIn;

	let user;
	let userId;

	onAuthStateChanged(auth, (user) => {
		if (user) {
			showLoggedIn = true;
			user = user;
			console.log(user);
			userId = user.uid;

			get(ref(db, 'users/' + userId)).then((snapshot) => {
				userFirebaseConfigRaw = snapshot.val().firebaseConfig.substring(1);
				userFirebaseConfigRaw = userFirebaseConfigRaw.substring(
					0,
					userFirebaseConfigRaw.length - 1
				);
				console.log(userFirebaseConfigRaw);
			});
		} else {
			showLoggedIn = false;
			window.location = '/';
		}
	});

	function getData() {}

	function submitFirebaseConfig() {
		console.log(userFirebaseConfigRaw);

		update(ref(db, 'users/' + userId), {
			firebaseConfig: JSON.stringify(userFirebaseConfigRaw)
		}).then(() => {
			console.log('lmao success');
		});
	}

	onMount(() => {
		getData();
	});
</script>

damn brother put your firebase config here

<input type="text" name="" id="" bind:value={userFirebaseConfigRaw} />

<button on:click={submitFirebaseConfig}>submit config</button>
