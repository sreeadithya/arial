<script>
	import { logInButton, logOutButton } from '../lib/firebase';

	import '../app.css';
	import { userDetails } from '../lib/store';
</script>

{$userDetails.displayName}
{$userDetails.userId}

<div class="outline-2 outline-[#000] outline-dotted m-4 flex flex-col gap-3">
	header
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
</div>

<slot />
