<script>
	import '../app.css';
	import { userDetails } from '../lib/store';
</script>

<div class="outline-2 outline-[#000] outline-dotted m-4 flex flex-col gap-3">
	<div>arial</div>
	<div>
		{#if $userDetails.displayName}
			logged in as {$userDetails.displayName}
		{/if}
	</div>
</div>

<slot />
