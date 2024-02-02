<script>
	import { logInButton, logOutButton } from '../lib/firebase';

	import '../app.css';
	import { userDetails } from '../lib/store';
</script>

<slot />

{$userDetails.displayName}

<button
	on:click={() => {
		logInButton();
	}}
	>log in
</button>
<button
	on:click={() => {
		logOutButton();
	}}
	>log out
</button>
