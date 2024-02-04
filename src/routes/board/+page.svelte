<script>
	import { onAuthStateChanged } from 'firebase/auth';
	import { logInButton, logOutButton, db, auth } from '../../lib/firebase';
	import { userDetails } from '../../lib/store';
	import { ref, update, set, get, child, remove } from 'firebase/database';

	let userId;
	let user;

	onAuthStateChanged(auth, (user) => {
		if (user) {
			user = user;
			userId = user.uid;
		} else {
		}
	});

	async function buyBoard() {
		if ($userDetails.userId) {
			update(ref(db, 'users/' + userId + '/'), {
				boardPurchased: true
			}).then(() => {
				console.log('lmao success');
			});
		} else {
			await logInButton();

			update(ref(db, 'users/' + userId + '/'), {
				boardPurchased: true
			}).then(() => {
				console.log('lmao success');
			});
		}
	}
</script>

<button
	on:click={() => {
		buyBoard();
	}}>buy board</button
>
