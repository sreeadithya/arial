<script>
	// Importing Rich Text Editor Dependencies
	import EditorJS from '@editorjs/editorjs';
	import Header from '@editorjs/header';
	import Underline from '@editorjs/underline';
	import List from '@editorjs/list';
	import Table from '@editorjs/table';
	import AttachesTool from '@editorjs/attaches';
	import ImageTool from '@editorjs/image';

	// Importing Toast Notifications Package
	import { Notyf } from 'notyf';
	import 'notyf/notyf.min.css';

	// Importing Firebase Dependencies
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth, db, storage } from '../../../lib/firebase';
	import { onMount } from 'svelte';
	import { ref, set, get, child, remove } from 'firebase/database';
	import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

	// Setting Up Toast Notifications
	var notyf = new Notyf({
		duration: 2000,
		position: {
			x: 'center',
			y: 'bottom'
		}
	});

	// Client Side Compression Lib
	import imageCompression from 'browser-image-compression';

	// Defining Reactive Variables
	let currentAnnouncement;
	let editPinned;
	let editDate;
	let editAnnouncementTitle;
	let editThumbnailLocation;
	let thumbnailLocation;
	let announcements;
	let announcementsTitles = [];
	let announcementValue = [];
	let pinnedAnnouncements = [];
	let pinned = false;
	let normalAnnouncements = [];
	let pinnedAnnouncementsTitles = [];
	let normalAnnouncementsTitles = [];
	let showTitleAnnouncement = 'block';
	let showLoggedIn = 'none';
	let showEditorJs = 'none';
	let date = null;
	let titleAnnouncement = '';
	let uid;
	let thumbnailDownloadURL;
	let currentAnnouncementForDeletion = '';

	// Getting data on page load
	onMount(() => {
		getData();
	});

	// Check for authentication status and change accordingly
	onAuthStateChanged(auth, (user) => {
		if (user) {
			showLoggedIn = true;
			console.log(user);
		} else {
			showLoggedIn = false;
			window.location = '/';
		}
	});

	// Getting the data to display
	function getData() {
		announcements = {};
		announcementsTitles = {};
		pinnedAnnouncements = [];
		normalAnnouncements = [];
		pinnedAnnouncementsTitles = [];
		normalAnnouncementsTitles = [];
		get(ref(db, 'announcements/')).then((snapshot) => {
			// Fetching the existing announcements from the database
			if (snapshot.exists()) {
				announcements = snapshot.val();

				console.warn(announcements);

				announcementsTitles = Object.keys(announcements);

				announcementValue = Object.values(announcements);

				let datesContainer = [];

				for (let i = 0; i < announcementValue.length; i++) {
					let date = announcementValue[i].date;

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

				let sortedAnnouncements = [];

				for (let j = 0; j < datesContainer.length; j++) {
					console.log(datesContainer[j][0]);
					// Object.values(announcements)[datesContainer[j][1]].index = j;

					sortedAnnouncements.push(Object.values(announcements)[datesContainer[j][1]]);
				}

				console.log(sortedAnnouncements);

				sortedAnnouncements.reverse();

				for (let i = 0; i < announcementsTitles.length; i++) {
					if (sortedAnnouncements[i].pinned == true) {
						pinnedAnnouncements = [...pinnedAnnouncements, sortedAnnouncements[i]];
					} else {
						normalAnnouncements = [...normalAnnouncements, sortedAnnouncements[i]];
					}
				}
				pinnedAnnouncementsTitles = Object.keys(pinnedAnnouncements);
				normalAnnouncementsTitles = Object.keys(normalAnnouncements);
			} else {
				// If none found, just empty array/sets
				announcements = {};
				announcementsTitles = {};
				pinnedAnnouncements = [];
				normalAnnouncements = [];
				pinnedAnnouncementsTitles = [];
				normalAnnouncementsTitles = [];
			}
		});
	}

	// Setting Up EditorJS
	const editor = new EditorJS({
		// Defining all the tools possible to use in the editor
		tools: {
			header: {
				class: Header,
				inlineToolbar: true
			},
			Underline,
			List: {
				class: List,
				inlineToolbar: true,
				config: {
					defaultStyle: 'unordered'
				}
			},
			table: {
				class: Table,
				inlineToolbar: true
			},
			attaches: {
				class: AttachesTool,
				config: {
					// Allowing file uploads by attachments
					uploader: {
						async uploadByFile(file) {
							console.log(file);
							console.log(titleAnnouncement);

							let storeRef = storageRef(
								storage,
								`announcements/${titleAnnouncement.replaceAll(' ', '_')}/${file.name}`
							);
							console.log(storeRef);

							// Create a promise to resolve with the download URL when the upload is complete
							return new Promise((resolve, reject) => {
								const uploadTask = uploadBytesResumable(storeRef, file);

								uploadTask.on(
									'state_changed',
									(snapshot) => {
										console.log(snapshot);
									},
									(error) => {
										reject(error);
										console.log(error);
									},
									() => {
										// Once the upload is complete, get the download URL
										getDownloadURL(uploadTask.snapshot.ref)
											.then((downloadURL) => {
												// Resolve the promise with the download URL
												resolve({
													success: 1,
													file: {
														url: downloadURL
													}
												});
											})
											.catch((error) => {
												reject(error);
												console.log(error);
											});
									}
								);
							});
						}
					}
				}
			},
			image: {
				class: ImageTool,
				config: {
					uploader: {
						async uploadByFile(file) {
							console.log(file);
							console.log(titleAnnouncement);

							const storeRef = storageRef(
								storage,
								`announcements/${titleAnnouncement.replaceAll(' ', '_')}/${file.name}`
							);
							console.log(storeRef);

							// Create a promise to resolve with the download URL when the upload is complete
							return new Promise((resolve, reject) => {
								const uploadTask = uploadBytesResumable(storeRef, file);
								uploadTask.on(
									'state_changed',
									(snapshot) => {
										console.log(snapshot);
									},
									(error) => {
										reject(error);
										console.log(error);
									},
									() => {
										// Once the upload is complete, get the download URL
										getDownloadURL(uploadTask.snapshot.ref)
											.then((downloadURL) => {
												// Resolve the promise with the download URL
												resolve({
													success: 1,
													file: {
														url: downloadURL
													}
												});
											})
											.catch((error) => {
												reject(error);
												console.log(error);
											});
									}
								);
							});
						}
					}
				}
			}
		},
		placeholder: 'Edit the text of the announcement here',
		holder: 'newAnnouncementEditor'
	});

	const editor2 = new EditorJS({
		// Defining all the tools possible to be used in the editor while making changes
		tools: {
			header: {
				class: Header,
				inlineToolbar: true
			},
			Underline,
			List: {
				class: List,
				inlineToolbar: true,
				config: {
					defaultStyle: 'unordered'
				}
			},
			table: {
				class: Table,
				inlineToolbar: true
			},
			attaches: {
				class: AttachesTool,
				config: {
					uploader: {
						async uploadByFile(file) {
							console.log(file);
							console.log(editAnnouncementTitle);

							const storeRef = storageRef(
								storage,
								`announcements/${editAnnouncementTitle.replaceAll(' ', '_')}/${file.name}`
							);
							console.log(storeRef);

							// Create a promise to resolve with the download URL when the upload is complete
							return new Promise((resolve, reject) => {
								const uploadTask = uploadBytesResumable(storeRef, file);

								uploadTask.on(
									'state_changed',
									(snapshot) => {
										console.log(snapshot);
									},
									(error) => {
										reject(error);
										console.log(error);
									},
									() => {
										// Once the upload is complete, get the download URL
										getDownloadURL(uploadTask.snapshot.ref)
											.then((downloadURL) => {
												// Resolve the promise with the download URL
												resolve({
													success: 1,
													file: {
														url: downloadURL
													}
												});
											})
											.catch((error) => {
												reject(error);
												console.log(error);
											});
									}
								);
							});
						}
					}
				}
			},
			image: {
				class: ImageTool,
				config: {
					uploader: {
						async uploadByFile(file) {
							console.log(file);
							console.log(editAnnouncementTitle);

							const storeRef = storageRef(
								storage,
								`announcements/${editAnnouncementTitle.replaceAll(' ', '_')}/${file.name}`
							);
							console.log(storeRef);

							// Create a promise to resolve with the download URL when the upload is complete
							return new Promise((resolve, reject) => {
								const uploadTask = uploadBytesResumable(storeRef, file);
								uploadTask.on(
									'state_changed',
									(snapshot) => {
										console.log(snapshot);
									},
									(error) => {
										reject(error);
										console.log(error);
									},
									() => {
										// Once the upload is complete, get the download URL
										getDownloadURL(uploadTask.snapshot.ref)
											.then((downloadURL) => {
												// Resolve the promise with the download URL
												resolve({
													success: 1,
													file: {
														url: downloadURL
													}
												});
											})
											.catch((error) => {
												reject(error);
												console.log(error);
											});
									}
								);
							});
						}
					}
				}
			}
		},
		placeholder: 'Edit the text of the announcement here',
		holder: 'editAnnouncementEditor'
	});

	async function publishData(editorData) {
		// Error handling before publishing of the announcement
		if (!date) {
			// Checking for date
			notyf.error('Please add a date for the announcement');
			return;
		}

		console.log(editorData);
		console.log(thumbnailLocation);

		if (!thumbnailLocation) return;

		const imageFile = thumbnailLocation[0];
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

			let storeRef = storageRef(
				storage,
				`announcements/${titleAnnouncement.replaceAll(' ', '_')}/${thumbnailLocation[0].name}`
			);
			const uploadTask = uploadBytesResumable(storeRef, compressedFile);

			uploadTask.on(
				'state_changed',
				(snapshot) => {},
				(error) => {
					reject(error);
				},
				() => {
					getDownloadURL(uploadTask.snapshot.ref)
						.then((downloadURL) => {
							// Create a promise to resolve with the download URL when the upload is complete
							set(ref(db, 'announcements/' + titleAnnouncement.replaceAll(' ', '_')), {
								title: titleAnnouncement,
								data: editorData,
								pinned: pinned,
								date: date,
								thumbnail: downloadURL
							})
								.then(() => {
									notyf.success('Successfully published');
									titleAnnouncement = undefined;
									thumbnailLocation = undefined;
									editor.clear();
									pinned = false;
									date = undefined;
									showEditorJs = 'none';
									document.querySelector('[data-newAnnouncement]').close();
								})
								.catch((error) => {
									notyf.error(`There was an error publishing the announcement" + ${error}`);
								});

							// Fetching new data after publishing the announcements
							setTimeout(getData, 100);
						})
						.catch((error) => {
							reject(error);
							uploadError = error;
						});
				}
			);
		} catch (error) {
			console.log(error);
		}
	}

	function editAnnouncement(title) {
		// Fetching announcement to edit

		get(ref(db, 'announcements/' + title.replaceAll(' ', '_'))).then((snapshot) => {
			currentAnnouncement = snapshot.val();
			editor2.blocks.render(currentAnnouncement.data);
			document.querySelector('[data-editAnnouncement]').showModal();
			editAnnouncementTitle = currentAnnouncement.title;
			editPinned = currentAnnouncement.pinned;
			editDate = currentAnnouncement.date;
			thumbnailDownloadURL = currentAnnouncement.thumbnail;
			console.log(currentAnnouncement.data);
		});
	}

	async function publishEditedData(editorData) {
		// Type checkers for titles, dates, etc
		if (!editAnnouncementTitle) {
			notyf.error('Please add a title');
			return;
		}
		if (!editDate) {
			notyf.error('Please add a date for the announcement');
			return;
		}

		console.error(editThumbnailLocation);

		if (editThumbnailLocation != undefined) {
			const imageFile = editThumbnailLocation[0];
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

				let storeRef = storageRef(
					storage,
					`announcements/${titleAnnouncement.replaceAll(' ', '_')}/${editThumbnailLocation[0].name}`
				);
				const uploadTask = uploadBytesResumable(storeRef, compressedFile);

				uploadTask.on(
					'state_changed',
					(snapshot) => {},
					(error) => {
						reject(error);
					},
					() => {
						getDownloadURL(uploadTask.snapshot.ref)
							.then((downloadURL) => {
								// Create a promise to resolve with the download URL when the upload is complete
								// Code to change the spaces to underscores (_) to prevent errors while posting to the database
								set(ref(db, 'announcements/' + editAnnouncementTitle.replaceAll(' ', '_')), {
									title: editAnnouncementTitle,
									data: editorData,
									pinned: editPinned,
									thumbnail: downloadURL,
									date: editDate
								})
									.then(() => {
										notyf.success('Successfully edited');
										document.querySelector('[data-editAnnouncement]').close();

										editor2.clear();

										setTimeout(getData, 100);
									})
									.catch((error) => {
										notyf.error(`There was an error editing the announcement" + ${error}`);
									});
							})
							.catch((error) => {
								reject(error);
								uploadError = error;
							});
					}
				);
			} catch (error) {
				console.log(error);
			}
		} else {
			set(ref(db, 'announcements/' + editAnnouncementTitle.replaceAll(' ', '_')), {
				title: editAnnouncementTitle,
				data: editorData,
				pinned: editPinned,
				thumbnail: thumbnailDownloadURL,
				date: editDate
			})
				.then(() => {
					notyf.success('Successfully edited');
					document.querySelector('[data-editAnnouncement]').close();

					editor2.clear();

					setTimeout(getData, 100);
				})
				.catch((error) => {
					notyf.error(`There was an error editing the announcement" + ${error}`);
				});
		}

		// Fetching new announcements after successfully editing the announcements
	}

	function deleteAnnouncement(title) {
		currentAnnouncementForDeletion = title;

		document.querySelector('[data-confirmDeleteModal]').showModal();
	}
</script>

<!-- ! HTML code to display the announcements page-->
what
{#if showLoggedIn}
	<!-- ? Checking for authentication of the user-->
	<main
		class="pt-5 px-10 m-5 w-[100%] rounded-xl bg-black text-black max-[1000px]:w-[102vw] max-[1000px]:m-0 max-[1000px]:pt-0"
	>
		<div class="h-[90vh] overflow-auto max-[1000px]:h-max max-[1000px]:overflow-scroll">
			<div class="flex justify-between pt-5">
				<p class="text-[30px] text-[#ffffffbb]"><b>Pinned</b></p>

				<button
					class=" text-[#ffffffbb] hover:bg-[#151515] p-3 rounded-lg animate-all duration-200"
					on:click={() => {
						document.querySelector('[data-newAnnouncement]').showModal();
						showTitleAnnouncement = 'block';
					}}
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

			<!-- ! Separating between pinned and unpinned announcements -->
			<!-- ? Pinned announcements  -->
			<div class="all-announcements py-5 grid grid-cols-3 gap-6 pr-3 max-[1000px]:grid-cols-1">
				{#each pinnedAnnouncementsTitles as i}
					<div class="w-[100%]">
						<img src={pinnedAnnouncements[i].thumbnail} alt="" class="rounded-md w-max h-max" />

						<div class="flex justify-between w-[100%] pt-2">
							<p>{pinnedAnnouncements[i].title}</p>

							<p class="text-[#ffffff80]">
								{pinnedAnnouncements[i].date.split('-').reverse().join('-')}
							</p>
						</div>

						<div class="flex flex-row gap-5 pt-1">
							<button on:click={editAnnouncement(pinnedAnnouncements[i].title)}
								><u class="hover:text-[#ffffffb2] duration-200">Edit</u>
							</button>
							<button on:click={deleteAnnouncement(pinnedAnnouncements[i].title)}
								><u class="hover:text-[#ff9c9c] duration-200">Delete</u>
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- ? Normal announcements  -->
			<p class="text-[30px] text-[#ffffffbb] mt-10"><b>Normal</b></p>
			<div class="all-announcements py-5 grid grid-cols-3 gap-6 pr-3 max-[1000px]:grid-cols-1">
				{#each normalAnnouncementsTitles as i}
					<div class="w-[100%]">
						<img src={normalAnnouncements[i].thumbnail} alt="" class="rounded-md w-max h-max" />

						<div class="flex justify-between w-[100%] pt-2">
							<p>{normalAnnouncements[i].title}</p>

							<p class="text-[#ffffff80]">
								{normalAnnouncements[i].date.split('-').reverse().join('-')}
							</p>
						</div>

						<div class="flex flex-row gap-5 pt-1">
							<button on:click={editAnnouncement(normalAnnouncements[i].title)}
								><u class="hover:text-[#ffffffb2] duration-200">Edit</u>
							</button>
							<button on:click={deleteAnnouncement(normalAnnouncements[i].title)}
								><u class="hover:text-[#ff9c9c] duration-200">Delete</u>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<!-- !? New Announcement Button -->
		<dialog
			data-newAnnouncement
			on:close={() => {
				showTitleAnnouncement = 'block';
				showEditorJs = 'none';
				titleAnnouncement = '';
				thumbnailLocation = undefined;
				date = null;
				pinned = false;

				editor.clear();
			}}
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[50%] border-[#151515] border-2"
		>
			<div class="flex items-center justify-between pb-6">
				<button
					class="p-3 rounded-lg hover:bg-[#151515] text-white group animate-all duration-200"
					on:click={() => {
						document.querySelector('[data-newAnnouncement]').close();
						showTitleAnnouncement = 'block';
						showEditorJs = 'none';
						titleAnnouncement = '';
						thumbnailLocation = undefined;
						date = null;
						pinned = false;

						editor.clear();
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

				<div class="flex items-center" style="display: {showEditorJs};">
					<label class="checkBoxContainer">
						<input class="checkBox" type="checkbox" bind:checked={pinned} id="isPinned" />

						<span
							class="checkBoxIndicator p-3 border-2 border-[#3d3d3d] rounded-md hover:bg-[#151515] animate-all duration-200"
						/>
					</label>
					Pin
				</div>

				<div
					style="display: {showEditorJs};"
					class="relative cursor-pointer overflow-hidden inline-block hover:bg-[#202020] bg-[#171717] p-3 rounded-lg animate-all duration-200"
				>
					<button class="cursor-pointer">
						{#if !thumbnailLocation}
							Select Thumbnail
						{:else}
							Thumbnail Selected
						{/if}
					</button>

					<input
						type="file"
						alt=""
						name=""
						id="fileInput"
						class="absolute left-0 top-0 opacity-0 !cursor-pointer"
						bind:files={thumbnailLocation}
						accept=".png, .jpg, .jpeg"
					/>
				</div>

				<input
					style="display: {showEditorJs};"
					type="date"
					class=" p-3 rounded-lg bg-[#171717]"
					name=""
					id="date"
					bind:value={date}
				/>

				<button
					class="p-3 rounded-lg hover:bg-[#151515] text-white animate-all duration-200"
					style="display: {showTitleAnnouncement};"
					on:click={() => {
						if (titleAnnouncement == '') {
							notyf.error('Please add a title');
							return;
						}
						showTitleAnnouncement = 'none';
						showEditorJs = 'block';
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						class="fill-white"
						viewBox="0 0 256 256"
						><path
							d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"
						/></svg
					>
				</button>
				<button
					style="display: {showEditorJs};"
					class="p-3 rounded-lg hover:bg-[#202020] bg-[#171717] text-white group animate-all duration-200"
					on:click={() => {
						editor
							.save()
							.then((outputData) => {
								publishData(outputData);
							})
							.catch((error) => {
								console.log('Saving failed: ', error);
							});
					}}>Publish Announcement</button
				>
			</div>
			<input
				name=""
				id=""
				style="display: {showTitleAnnouncement};"
				class="py-3 pl-5 w-[100%] rounded-lg border col-span-1 border-[#3d3d3d] bg-[#0D0D0D]"
				placeholder="Title of New Annoucement"
				bind:value={titleAnnouncement}
			/>
			<p class="mt-3 text-sm text-gray-500" style="display: {showTitleAnnouncement};">
				Make sure the title is concise and is less than 30 words <br />
				Only plain text, numbers, hyphens and slashes are allowed <br />
				Do not use special characters such as asterisks, periods, etc
			</p>

			<div
				class="editorJsEditor prose rounded-lg border max-w-none overflow-auto max-h-[45vh] w-[100%] mr-0 px-5 py-3 bg-white"
				style="display: {showEditorJs};"
			>
				<div id="newAnnouncementEditor" />
			</div>
		</dialog>

		<!-- !? Edit Announcement -->
		<dialog
			data-editAnnouncement
			on:close={() => {
				editor2.clear();
				editThumbnailLocation = undefined;
			}}
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[50%] border-[#151515] border-2"
		>
			<div class="flex items-center justify-between pb-6 align-middle">
				<button
					class="p-3 rounded-lg hover:bg-[#151515] text-white group animate-all duration-200"
					on:click={() => {
						document.querySelector('[data-editAnnouncement]').close();
						editor2.clear();
						editThumbnailLocation = undefined;
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
				<div class="flex items-center">
					<label class="checkBoxContainer">
						<input class="checkBox" type="checkbox" bind:checked={editPinned} id="isPinned" />

						<span
							class="checkBoxIndicator p-3 border-2 border-[#3d3d3d] rounded-md hover:bg-[#151515] animate-all duration-200"
						/>
					</label>
					Pin
				</div>
				<div
					class="relative cursor-pointer overflow-hidden inline-block bg-[#171717] hover:bg-[#202020] p-3 rounded-lg animate-all duration-200"
				>
					<button class="cursor-pointer"> Update Thumbnail </button>

					<input
						type="file"
						alt=""
						name=""
						id="fileInput"
						class="absolute left-0 top-0 opacity-0 !cursor-pointer"
						bind:files={editThumbnailLocation}
						accept=".png, .jpg, .jpeg"
					/>
				</div>
				<input
					type="date"
					class=" bg-[#171717] p-3 rounded-lg"
					name=""
					id="date"
					bind:value={editDate}
				/>

				<button
					class="p-3 rounded-lg hover:bg-[#202020] text-white group animate-all duration-200 bg-[#171717]"
					on:click={() => {
						editor2
							.save()
							.then((outputData) => {
								publishEditedData(outputData);
							})
							.catch((error) => {
								console.log('Saving failed: ', error);
							});
					}}>Publish Changes</button
				>
			</div>

			<div
				class="prose rounded-lg border max-w-none w-[100%] overflow-auto max-h-[45vh] mr-0 px-5 py-3 mb-4 border-gray-300 bg-white"
			>
				<div id="editAnnouncementEditor" />
			</div>

			<div class="flex flex-row items-center justify-between gap-5 pt-2">
				<div>Editing - <b>{editAnnouncementTitle}</b></div>
			</div>
		</dialog>

		<!-- !? Confirm Deletion -->
		<dialog
			data-confirmDeleteModal
			class="bg-[#0D0D0D] text-white p-5 rounded-lg w-[40%] border-[#151515] border-2"
		>
			<div class="flex items-center justify-between align-middle">
				<span
					>Permanently Delete <b>{currentAnnouncementForDeletion.replaceAll('_', ' ')}</b>
					? <br />
					<p class="mt-1 text-sm text-gray-500" id="file_input_help">
						This action is irreversible
					</p></span
				>

				<div class="flex items-center justify-between gap-4">
					<button
						class="p-3 rounded-lg hover:bg-[#202020] bg-[#171717] hover:text-[#ff9c9c] text-white group animate-all duration-200"
						on:click={() => {
							remove(
								ref(db, 'announcements/' + currentAnnouncementForDeletion.replaceAll(' ', '_'))
							).then(() => {
								currentAnnouncementForDeletion = undefined;
							});

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
	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(5px);
		opacity: 5;
		animation: dialogFadeIn 0.3s;
	}

	dialog[open] {
		animation: dialogFadeIn 0.3s;
		opacity: 1;
	}
	@keyframes dialogFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.checkBoxContainer input {
		display: none;
		cursor: pointer;
	}

	.checkBoxContainer .checkBoxIndicator {
		transform: scale(0.8);
		display: block;
		float: left;
		margin-right: 5px;
		cursor: pointer;
	}
	.checkBoxContainer input:checked ~ .checkBoxIndicator {
		background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzg4IiBoZWlnaHQ9IjM4OCIgdmlld0JveD0iMCAwIDM4OCAzODgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0zNDQgMTE0LjMwNEwzMDYuNzQyIDc3TDE0Ny41NDggMjM2LjMzMUw4MS4yNTgxIDE3MC4wMTlMNDQgMjA3LjMyM0wxNDcuNTQ4IDMxMUwzNDQgMTE0LjMwNFoiIGZpbGw9IiNCMEIwQjAiLz4KPC9zdmc+Cg==)
			center/cover no-repeat;
		color: #121212;
	}

	* {
		color-scheme: dark;
	}
</style>
