<script>
	import { auth, db, storage } from '../../../lib/firebase';
	import { ref, set, get, child, remove } from 'firebase/database';
	import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
	import { onAuthStateChanged } from 'firebase/auth';
	import { userDetails } from '../../../lib/store';

	let userFirebaseConfig;
	let showLoggedIn;

	let user;

	let userId = $userDetails.userId;

	onAuthStateChanged(auth, (user) => {
		if (user) {
			showLoggedIn = true;
			user = user;
			console.log(user);
		} else {
			showLoggedIn = false;
			window.location = '/';
		}
	});

	function submitFirebaseConfig() {
		console.log(userFirebaseConfig);

		set(ref(db, 'users/' + userId), {
			firebaseConfig: JSON.stringify(userFirebaseConfig)
		}).then(() => {
			console.log('lmao success');
		});
	}
</script>

damn brother put your firebase config here

<input type="text" name="" id="" bind:value={userFirebaseConfig} />

<button on:click={submitFirebaseConfig}>submit config</button>
