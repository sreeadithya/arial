<script>
	// Importing Firebase Dependencies
	import { onAuthStateChanged } from 'firebase/auth';
	import {
		ref,
		getDownloadURL,
		uploadBytesResumable,
		deleteObject,
		listAll
	} from 'firebase/storage';
	import { storage, db, auth } from '../../../lib/firebase';
	import { ref as dbref, set, update, get, remove } from 'firebase/database';
	import { onMount } from 'svelte';
	import { initializeApp } from 'firebase/app';
	import { getStorage } from 'firebase/storage';
	import { getDatabase } from 'firebase/database';

	// Importing Toast Notifications Package
	import { Notyf } from 'notyf';
	import 'notyf/notyf.min.css';
	var notyf = new Notyf({
		duration: 2000,
		position: {
			x: 'center',
			y: 'bottom'
		}
	});

	// Defining Reactive Variables
	let editImagesLocation = [];
	let imagesLocation = [];
	let showProg = 'none';
	let imageLinks = [];
	let albumName;
	let albumDate;
	let uid;
	let uploadError;
	let editAlbumName;
	let editAlbumDate;
	let editImageLinks = [];
	let showUploadButton = 'block';
	let deletedImages = [];
	let showLoggedIn = false;
	let currentGalleryForDeletion = '';
	let albumValue;
	let userId;
	let userFirebaseConfig = {};

	let userApp;
	let userStorage;
	let userDb;

	// Client Side Compression Lib
	import imageCompression from 'browser-image-compression';

	// Fetching all the gallery items to display
	function getData() {
		albums = {};
		albumTitles = [];
		get(dbref(userDb, 'gallery/')).then((snapshot) => {
			albums = snapshot.val();

			if (albums == null) {
				return;
			}
			let datesContainer = [];

			albumValue = Object.values(albums);

			for (let i = 0; i < albumValue.length; i++) {
				let date = albumValue[i].albumDate;

				let dateParts = date.split('-');
				let year = parseInt(dateParts[0]);
				let month = parseInt(dateParts[1]) - 1;
				let day = parseInt(dateParts[2]);

				let dateObject = new Date(year, month, day);
				let dateNumber = dateObject.getTime();
				console.log(dateNumber);

				datesContainer.push([dateNumber, i]);
			}

			datesContainer.sort();

			console.log(datesContainer);

			let sortedAlbums = [];

			for (let j = 0; j < datesContainer.length; j++) {
				console.log(datesContainer[j][0]);
				sortedAlbums.push(Object.values(albums)[datesContainer[j][1]]);
			}

			console.log(sortedAlbums);

			sortedAlbums.reverse();

			albumTitles = [];

			for (let i = 0; i < sortedAlbums.length; i++) {
				albumTitles.push(sortedAlbums[i]['title'].replaceAll(' ', '_'));
			}
			return albums;
		});
	}

	// Setting up a function to edit the gallery items
	function editAlbum(selectedAlbumName) {
		albums = {};
		albumTitles = [];
		get(dbref(userDb, 'gallery/')).then((snapshot) => {
			albums = snapshot.val();
			albumTitles = Object.keys(albums);

			console.log(albums);
			document.querySelector('[data-editAlbum]').showModal();
			console.log(albums);
			editAlbumName = selectedAlbumName.replaceAll('_', ' ');
			editAlbumDate = albums[selectedAlbumName].albumDate;
			// editImageLinks = albums[selectedAlbumName].imageLinks;
			for (let x = 0; x < Object.keys(albums[selectedAlbumName].imageLinks).length; x++) {
				editImageLinks = [...editImageLinks, albums[selectedAlbumName].imageLinks[x]];
				console.log(editImageLinks);
			}
		});
	}

	// Setting up a function to delete the items of the gallery
	function deleteAlbum(nameOfAlbum) {
		currentGalleryForDeletion = nameOfAlbum;

		document.querySelector('[data-confirmDeleteModal]').showModal();
	}

	// Setting up a function to edit existing items of the gallery
	async function updateAlbum() {
		// Handling for the proper type of input
		if (!editImagesLocation) {
			set(dbref(userDb, 'gallery/' + editAlbumName.replaceAll(' ', '_')), {
				title: editAlbumName,
				imageLinks: editImageLinks,
				albumDate: editAlbumDate
			}).then(() => {
				for (let i = 0; i < deletedImages.length; i++) {
					let segments = deletedImages[i].split('/');
					let lastSegment = segments[segments.length - 1];
					let decodedFileName = extractFileName(decodeURIComponent(lastSegment));
					deleteObject(ref(userStorage, `gallery/${editAlbumName}/${decodedFileName}`))
						.then(() => {
							console.log('deleted' + decodedFileName);
						})
						.catch((error) => {
							// TODO: Add notifications for the error handling
						});
				}
				showProg = 'none';
				showUploadButton = 'block';
				document.querySelector('[data-editAlbum]').close();

				editAlbumName = undefined;
				editAlbumDate = undefined;
				editImageLinks = [];
				editImagesLocation = '';
				const editFileInput = document.getElementById('editFileInput');
				editFileInput.value = '';
			});
		} else {
			const uploadPromises = [];

			for (let i = 0; i < editImagesLocation.length; i++) {
				const imageFile = editImagesLocation[i];
				console.log('originalFile instanceof Blob', imageFile instanceof Blob);
				console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

				const options = {
					maxSizeMB: 1,
					maxWidthOrHeight: 1920,
					useWebWorker: true
				};
				try {
					const compressedFile = await imageCompression(imageFile, options);
					console.log('compressedFile instanceof Blob', compressedFile instanceof Blob);
					console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);

					const storageRef = ref(
						userStorage,
						`gallery/${editAlbumName}/${editImagesLocation[i].name}`
					);
					const uploadTask = uploadBytesResumable(storageRef, compressedFile);

					const uploadPromise = new Promise((resolve, reject) => {
						uploadTask.on(
							'state_changed',
							(snapshot) => {
								showProg = 'block';
								showUploadButton = 'none';
							},
							(error) => {
								reject(error);
								uploadError = error;
							},
							() => {
								getDownloadURL(uploadTask.snapshot.ref)
									.then((downloadURL) => {
										editImageLinks = [...editImageLinks, downloadURL];
										resolve(downloadURL);
									})
									.catch((error) => {
										reject(error);
										uploadError = error;
									});
							}
						);
					});
					uploadPromises.push(uploadPromise);
				} catch (error) {
					console.log(error);
				}
			}

			// Waiting for previous promises to finish to execute all of them at once
			Promise.all(uploadPromises).then((downloadURLs) => {
				// editAlbum(editAlbumName);
				set(dbref(userDb, 'gallery/' + editAlbumName.replaceAll(' ', '_')), {
					title: editAlbumName,
					imageLinks: editImageLinks,
					albumDate: editAlbumDate
				}).then(() => {
					for (let i = 0; i < deletedImages.length; i++) {
						let segments = deletedImages[i].split('/');
						let lastSegment = segments[segments.length - 1];
						let decodedFileName = extractFileName(decodeURIComponent(lastSegment));
						deleteObject(ref(userStorage, `gallery/${editAlbumName}/${decodedFileName}`))
							.then(() => {
								console.log('deleted' + decodedFileName);
							})
							.catch((error) => {
								// TODO: Add notifications for the error handling
							});
					}
					showProg = 'none';
					showUploadButton = 'block';
					document.querySelector('[data-editAlbum]').close();

					editAlbumName = undefined;
					editAlbumDate = undefined;
					editImagesLocation = '';
					const editFileInput = document.getElementById('editFileInput');
					editFileInput.value = '';
				});
				update(dbref(userDb, 'gallery/' + editAlbumName.replaceAll(' ', '_') + '/' + imageLinks), {
					editImageLinks
				})
					.then(() => {})
					.catch((error) => {
						uploadError = error;
					});

				notyf.success('Successfully Updated Album');
				editImageLinks = [];
				getData();
			});
		}
	}

	// Look for change in user authentication state
	onAuthStateChanged(auth, (user) => {
		if (user) {
			uid = user.uid;
			showLoggedIn = true;

			userId = user.uid;

			console.error(userId);
			console.log(userId);
			get(dbref(db, 'users/' + userId)).then((snapshot) => {
				snapshot.forEach((childSnapshot) => {
					console.warn(childSnapshot.val());

					let values = childSnapshot
						.val()
						.replaceAll('const firebaseConfig = ', '')
						.replaceAll('\\', '')
						.replace(';', '')
						.substring(1);

					let valuesFinal = values.substring(0, values.length - 1);

					valuesFinal = valuesFinal
						.replace('apiKey', '"apiKey"')
						.replace('authDomain', '"authDomain"')
						.replace('databaseURL', '"databaseURL"')
						.replace('projectId', '"projectId"')
						.replace('storageBucket', '"storageBucket"')
						.replace('messagingSenderId', '"messagingSenderId"')
						.replace('appId', '"appId"');

					userFirebaseConfig = JSON.parse(valuesFinal);
					console.log(userFirebaseConfig);

					userApp = initializeApp(userFirebaseConfig, 'user');
					userStorage = getStorage(userApp);
					userDb = getDatabase(userApp);

					getData();
				});
			});
		} else {
			showLoggedIn = false;
			window.location = '/';
		}
	});

	// Removing a value from a given array
	function arrayRemove(array, valueToRemove) {
		const index = array.indexOf(valueToRemove);
		if (index !== -1) {
			array.splice(index, 1);
		}
	}

	let albums;
	let albumTitles = [];

	// Getting data on page load
	onMount(() => {
		getData();
	});

	// Function to upload images to the gallery
	async function uploadImages() {
		if (!imagesLocation) return;

		const uploadPromises = [];

		for (let i = 0; i < imagesLocation.length; i++) {
			const imageFile = imagesLocation[i];
			console.log('originalFile instanceof Blob', imageFile instanceof Blob);
			console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

			const options = {
				maxSizeMB: 1,
				maxWidthOrHeight: 1920,
				useWebWorker: true
			};
			try {
				const compressedFile = await imageCompression(imageFile, options);
				console.log('compressedFile instanceof Blob', compressedFile instanceof Blob);
				console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);

				const storageRef = ref(userStorage, `gallery/${albumName}/${imagesLocation[i].name}`);
				const uploadTask = uploadBytesResumable(storageRef, compressedFile);

				const uploadPromise = new Promise((resolve, reject) => {
					uploadTask.on(
						'state_changed',
						(snapshot) => {
							showProg = 'block';
							showUploadButton = 'none';
						},
						(error) => {
							reject(error);
							uploadError = error;
						},
						() => {
							getDownloadURL(uploadTask.snapshot.ref)
								.then((downloadURL) => {
									imageLinks = [...imageLinks, downloadURL];
									resolve(downloadURL);
								})
								.catch((error) => {
									reject(error);
									uploadError = error;
								});
						}
					);
				});
				uploadPromises.push(uploadPromise);
			} catch (error) {
				console.log(error);
			}
		}

		// Waiting for previous promises to finish so everything can be executed at once
		Promise.all(uploadPromises)
			.then((downloadURLs) => {
				set(dbref(userDb, 'gallery/' + albumName.replaceAll(' ', '_')), {
					title: albumName,
					imageLinks: imageLinks,
					albumDate: albumDate
				}).then(() => {
					showProg = 'none';
					showUploadButton = 'block';
					document.querySelector('[data-newAlbum]').close();
					albumName = undefined;
					albumDate = undefined;
					imageLinks = undefined;
					imagesLocation = '';
					const fileInput = document.getElementById('fileInput');
					fileInput.value = '';
				});
				notyf.success('Successfully Published Album');
				getData();
			})
			.catch((error) => {
				uploadError = error;
			});
	}

	// Deleting images from the album and database
	function deleteImageFromAlbum(imageUrl) {
		arrayRemove(editImageLinks, imageUrl);
		editImageLinks = editImageLinks;
		console.log(editImageLinks);

		deletedImages = [...deletedImages, imageUrl];

		console.log();
		console.log(deletedImages);
	}

	function extractFileName(url) {
		const match = url.match(/\/([^/?#]+)\?/);

		if (match && match[1]) {
			return decodeURIComponent(match[1]);
		}
	}
</script>

<!-- ! HTML to display the gallery page -->
<!-- ? Check for authentication of the user for the display -->
{#if showLoggedIn}
	<main
		class="pt-5 px-10 m-5 w-[100%] rounded-xl bg-black text-white max-[1000px]:w-[102vw] max-[1000px]:m-0 max-[1000px]:pt-0"
	>
		<div class="flex items-center justify-between py-5">
			<!-- ? Displaying all albums in the gallery -->
			<p class="text-[30px] text-[#ffffffbb]"><b>All Albums</b></p>
			<button
				on:click={() => {
					document.querySelector('[data-newAlbum]').showModal();
				}}
				class=" text-[#ffffffbb] hover:bg-[#151515] p-3 rounded-lg animate-all duration-200"
				><svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					fill="#ffffff"
					viewBox="0 0 256 256"
					><path
						d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
					/></svg
				></button
			>
		</div>

		<div>
			<div class="h-[83.2vh] overflow-auto grid grid-cols-3 gap-6">
				{#each albumTitles as i}
					<div class=" w-[100%]">
						<img
							src={albums[i].imageLinks[
								Math.floor(Math.random() * (albums[i].imageLinks.length - 0))
							]}
							class="rounded-md w-max h-max"
							alt=""
						/>
						<div class="flex justify-between w-[100%] pt-2">
							<p class="w-[50%]">{i.replaceAll('_', ' ')}</p>

							<p class="text-[#ffffff80]">
								{albums[i].albumDate.split('-').reverse().join('-')}
							</p>
						</div>

						<div class="flex flex-row gap-5 pt-1">
							<button on:click={editAlbum(i)} class="hover:text-[#ffffffb2] duration-200"
								><u>Edit</u>
							</button>
							<button on:click={deleteAlbum(i)} class="hover:text-[#ff9c9c] duration-200"
								><u>Delete</u>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- !? New Album Modal -->

		<dialog
			data-newAlbum
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[50%] border-[#151515] border-2"
		>
			<div class="flex justify-between pb-5">
				<button
					class="p-3 rounded-lg hover:bg-[#151515] text-white group animate-all duration-200"
					on:click={() => {
						document.querySelector('[data-newAlbum]').close();
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						class="fill-white"
						viewBox="0 0 256 256"
						><path
							d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
						/></svg
					>
				</button>
				<div>
					<button
						on:click={uploadImages}
						style="display: {showUploadButton}"
						class="p-3 rounded-lg hover:bg-[#202020] bg-[#171717] text-white group animate-all duration-200"
						>Publish Album
					</button>
					<div style="display: {showProg};">
						<!-- <img src="/LoadingSpinner.svg" class="mt-5 animate-spin-slow" alt="loading" /> -->
						we loading son
					</div>
				</div>
			</div>
			<div>
				<div class="flex flex-row items-start justify-between">
					<div>
						<input
							placeholder="Name of new album"
							class="py-3 pl-5 rounded-lg col-span-1 bg-[#171717] w-[100%]"
							bind:value={albumName}
						/>

						<p class="mt-3 text-sm text-gray-500">
							Make sure the name is concise and is less than 30 words <br />
							Only plain text, numbers, hyphens and slashes are allowed <br />
							Do not use special characters such as asterisks, periods, etc
						</p>
					</div>

					<input
						type="date"
						bind:value={albumDate}
						class="py-3 px-4 pl-5 rounded-lg w-[40%] bg-[#171717]"
					/>
				</div>

				<div class="flex items-end justify-between">
					<div>
						<div
							class="relative cursor-pointer overflow-hidden inline-block hover:bg-[#202020] bg-[#171717] transition-colors py-2 rounded-lg outline-[0.5px] outline-stone-900 outline text-white mt-5"
						>
							<button class="px-5 cursor-pointer"> {imagesLocation.length} images selected</button>
							<input
								type="file"
								alt=""
								name=""
								id="fileInput"
								class="absolute top-0 left-0 opacity-0 cursor-pointer"
								bind:files={imagesLocation}
								multiple
								accept=".png, .jpg, .jpeg"
							/>
						</div>

						<p class="mt-1 text-sm text-gray-500" id="file_input_help">
							Uploading 10-30 high quality images per album is recommended in <br />
							order to maintain a good quantity - quality ratio.
						</p>
					</div>
				</div>
			</div>
		</dialog>

		<!-- !? Edit Album Modal-->

		<dialog
			data-editAlbum
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[80%] border-[#151515] border-2"
		>
			<div class="flex items-center justify-between pb-5">
				<button
					class="p-3 rounded-lg hover:bg-[#151515] text-white group animate-all duration-200"
					on:click={() => {
						document.querySelector('[data-editAlbum]').close();
						editImageLinks = [];
						editImagesLocation = [];
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						class="fill-white group-hover:fill-[#ff9c9c] animate-all duration-200"
						viewBox="0 0 256 256"
						><path
							d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
						/></svg
					>
				</button>

				<div class="pl-[5px]">Editing - <b>{editAlbumName}</b></div>

				<button
					on:click={updateAlbum}
					style="display: {showUploadButton}"
					class="p-3 rounded-lg hover:bg-[#202020] bg-[#171717] text-white group animate-all duration-200"
					>Update Album
				</button>
				<div style="display: {showProg};">
					<!-- <img src="/LoadingSpinner.svg" class="mt-5 animate-spin-slow" alt="loading" /> -->
					it loading bruv trust
				</div>
			</div>
			<div>
				<form>
					<!-- show images here -->

					<div class="overflow-auto max-h-[45vh] mt-3">
						<div class="masonry">
							{#each editImageLinks as item (item)}
								<div class="relative bg-white rounded-lg shadow masonry-item">
									<button
										class="absolute bottom-3 right-3 p-2 group transition-colors rounded-lg outline-[0.5px] outline-stone-900 bg-[#414141cc] backdrop-blur-sm outline"
										on:click={deleteImageFromAlbum(item)}
										><svg
											class="fill-white duration-200 animate-all group-hover:fill-[#ff9c9c]"
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 256 256"
											><path
												d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
											/></svg
										></button
									>
									<img src={item} alt="" class="mt-3" />
								</div>
							{/each}
						</div>
					</div>
					<div class="flex items-end justify-between align-bottom">
						<div>
							<div
								class="relative cursor-pointer overflow-hidden inline-block hover:bg-[#202020] transition-colors py-2 rounded-lg bg-[#171717] outline-[0.5px] outline-stone-900 outline text-white mt-5"
							>
								<button class="px-5 cursor-pointer"
									>{editImagesLocation.length} images selected</button
								>
								<input
									type="file"
									alt=""
									name=""
									id="editFileInput"
									class="absolute top-0 left-0 opacity-0 cursor-pointer"
									bind:files={editImagesLocation}
									multiple
									accept=".png, .jpg, .jpeg"
								/>
							</div>
							<p class="mt-1 text-sm text-gray-500" id="file_input_help">
								Select more images to add to the album
							</p>
						</div>

						<input
							type="date"
							class=" p-3 rounded-lg bg-[#171717]"
							name=""
							id="date"
							bind:value={editAlbumDate}
						/>
					</div>
				</form>
			</div>
		</dialog>

		<!-- !? Confirm Deletion -->
		<dialog
			data-confirmDeleteModal
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[40%] border-[#151515] border-2"
		>
			<div class="flex items-center justify-between align-middle">
				<span
					>Permanently Delete <b>{currentGalleryForDeletion.replaceAll('_', ' ')}</b>
					? <br />
					<p class="mt-1 text-sm text-gray-500" id="file_input_help">
						This will also delete all images within this album <br />
						and the action is irreversible
					</p></span
				>

				<div class="flex items-center justify-between gap-4">
					<button
						class="p-3 rounded-lg hover:bg-[#202020] bg-[#171717] hover:text-[#ff9c9c] text-white group animate-all duration-200"
						on:click={() => {
							listAll(ref(userStorage, `gallery/${currentGalleryForDeletion}/`))
								.then((res) => {
									res.items.forEach((itemRef) => {
										deleteObject(itemRef);
									});
								})
								.catch((error) => {});
							remove(dbref(userDb, 'gallery/' + currentGalleryForDeletion.replaceAll(' ', '_')));
							document.querySelector('[data-confirmDeleteModal]').close();
							location.reload();
						}}>yes</button
					>
					<button
						class="flex gap-2 items-center p-3 rounded-lg hover:bg-[#202020] bg-[#171717] text-white group animate-all duration-200 group"
						on:click={() => {
							document.querySelector('[data-confirmDeleteModal]').close();
							location.reload();
						}}
						>cancel
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							class="duration-200 fill-white animate-all"
							viewBox="0 0 256 256"
							><path
								d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
							/></svg
						>
					</button>
				</div>
			</div>
		</dialog>
	</main>
{/if}

<style>
	.masonry {
		column-count: 6;
		column-gap: 1rem;
	}

	.masonry-main {
		column-count: 3;
		column-gap: 2rem;
	}

	.masonry-item {
		break-inside: avoid;
		margin-bottom: 2rem;
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.459);
		backdrop-filter: blur(5px);
	}

	* {
		color-scheme: dark;
	}
</style>
