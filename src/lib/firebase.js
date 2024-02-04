import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { userDetails } from '$lib/store.js';

const firebaseConfig = {
	apiKey: 'AIzaSyCTlm8JREX-RGhXJmxdS6AeexT0v2eQ1rk',
	authDomain: 'arial-86c03.firebaseapp.com',
	databaseURL: 'https://arial-86c03-default-rtdb.firebaseio.com',
	projectId: 'arial-86c03',
	storageBucket: 'arial-86c03.appspot.com',
	messagingSenderId: '527233156445',
	appId: '1:527233156445:web:fb3e6fac8f1adf184614b4'
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getDatabase(app);

import {
	getAuth,
	onAuthStateChanged,
	signOut,
	GoogleAuthProvider,
	signInWithPopup
} from 'firebase/auth';

let showLoggedIn;
let showLoggedOut;

const auth = getAuth();
let user = auth.currentUser;

// ! Functions to handle authentication of the user

const provider = new GoogleAuthProvider();

async function logInButton() {
	await signInWithPopup(auth, provider)
		.then((result) => {
			const credential = GoogleAuthProvider.credentialFromResult(result);
			const user = result.user;
			console.log(user);
		})
		.catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
			const email = error.customData.email;
			const credential = GoogleAuthProvider.credentialFromError(error);
		});
}

function logOutButton() {
	signOut(auth)
		.then(() => {
			console.log('signed Out successfully');
			console.log(uid);
		})
		.catch((error) => {
			// TODO Add functionality to error messages, codes
			const errorCode = error.code;
			const errorMessage = error.message;
		});
	window.location = '/';
}

onAuthStateChanged(auth, (user) => {
	if (user) {
		showLoggedIn = true;
		showLoggedOut = false;
		user = user;
		console.log(user.displayName);
		userDetails.set({ displayName: user.displayName, userId: user.uid });
	} else {
		showLoggedIn = false;
		showLoggedOut = true;
		user = user;
		userDetails.set({ displayName: '', userId: '' });
	}
});

export { auth, storage, app, db, showLoggedIn, logInButton, logOutButton, showLoggedOut };
