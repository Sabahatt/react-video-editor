"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import useKeyboardShortcuts from "./hooks/use-keyboard-shortcuts";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import useUploadStore from "./store/use-upload-store";
import { useAutoSave } from "./hooks/use-autosave";

const stateManager = new StateManager({
	size: {
		width: 1920,
		height: 1080,
	},
});

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
	const [projectName, setProjectName] = useState<string>("Untitled video");
	const [restaurant, setRestaurant] = useState<string>("default");
	const { scene } = useSceneStore();
	const timelinePanelRef = useRef<ImperativePanelHandle>(null);
	const sceneRef = useRef<SceneRef>(null);
	const { timeline, playerRef } = useStore();
	const { activeIds, trackItemsMap, transitionsMap } = useStore();
	const [loaded, setLoaded] = useState(false);
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const {
		setTrackItem: setLayoutTrackItem,
		setFloatingControl,
		setLabelControlItem,
		setTypeControlItem,
	} = useLayoutStore();
	const isLargeScreen = useIsLargeScreen();

	// Auto-save functionality - saves every 30 seconds
	const { status: autoSaveStatus, saveNow } = useAutoSave({
		stateManager,
		restaurant,
		projectName,
		intervalMs: 30000, // 30 seconds
		enabled: true,
	});

	useTimelineEvents();
	useKeyboardShortcuts();

	const { setCompactFonts, setFonts } = useDataState();

	const { setUploads, uploads: existingUploads } = useUploadStore();

	// Extract media (video, image, audio) from a design's trackItemsMap
	const extractMediaFromDesign = (design: any) => {
		const mediaUploads: Array<{
			id: string;
			url: string;
			type: string;
			preview?: string;
			metadata?: { alt?: string; uploadedUrl?: string; previewUrl?: string };
		}> = [];

		if (design.trackItemsMap) {
			Object.values(design.trackItemsMap).forEach((item: any) => {
				if (item.type === "video" && item.details?.src) {
					mediaUploads.push({
						id: `design_${item.id}`,
						url: item.details.src,
						type: "video",
						preview: item.metadata?.previewUrl,
						metadata: {
							alt: item.metadata?.alt || "Video",
							uploadedUrl: item.details.src,
							previewUrl: item.metadata?.previewUrl,
						},
					});
				} else if (item.type === "image" && item.details?.src) {
					mediaUploads.push({
						id: `design_${item.id}`,
						url: item.details.src,
						type: "image",
						metadata: {
							alt: item.metadata?.alt || "Image",
							uploadedUrl: item.details.src,
						},
					});
				} else if (item.type === "audio" && item.details?.src) {
					mediaUploads.push({
						id: `design_${item.id}`,
						url: item.details.src,
						type: "audio",
						metadata: {
							alt: item.metadata?.alt || "Audio",
							uploadedUrl: item.details.src,
						},
					});
				}
			});
		}

		return mediaUploads;
	};

	// Add extracted media to uploads, avoiding duplicates
	const syncMediaToUploads = (mediaUploads: any[]) => {
		if (mediaUploads.length > 0) {
			const existingUrls = new Set(existingUploads.map((u: any) => u.url));
			const newUploads = mediaUploads.filter((u) => !existingUrls.has(u.url));
			if (newUploads.length > 0) {
				setUploads([...existingUploads, ...newUploads]);
				console.log(`[Editor] Synced ${newUploads.length} media items to uploads`);
			}
		}
	};

	useEffect(() => {
		const loadDesignFromSource = async () => {
			// Try to load generated design from sessionStorage first
			const storedDesign = sessionStorage.getItem("generatedDesign");
			if (storedDesign) {
				try {
					const design = JSON.parse(storedDesign);
					dispatch(DESIGN_LOAD, { payload: design });

					// Extract and sync media to uploads panel
					const mediaUploads = extractMediaFromDesign(design);
					syncMediaToUploads(mediaUploads);

					// Extract restaurant name for auto-save folder
					const storedBrand = sessionStorage.getItem("generatedBrand");
					if (storedBrand) {
						try {
							const brand = JSON.parse(storedBrand);
							if (brand.restaurantName) {
								// Convert to folder-safe name
								const safeName = brand.restaurantName
									.toLowerCase()
									.replace(/[^a-z0-9]+/g, '-')
									.replace(/^-|-$/g, '');
								setRestaurant(safeName || 'default');
								setProjectName(brand.restaurantName + ' Ad');
							}
						} catch (e) {
							console.error("Failed to parse brand for restaurant name:", e);
						}
					}

					// Clear sessionStorage after loading
					sessionStorage.removeItem("generatedDesign");
					sessionStorage.removeItem("generatedBrand");
					sessionStorage.removeItem("generatedScript");
					console.log("Loaded generated design from sessionStorage");
					return; // Successfully loaded from sessionStorage
				} catch (error) {
					console.error("Failed to parse stored design:", error);
				}
			}

			// No sessionStorage design - try to load from autosave
			try {
				const response = await fetch('/api/autosave?restaurant=default');
				const result = await response.json();

				if (result.success && result.data?.design) {
					const { design, projectName: savedProjectName, restaurant: savedRestaurant, savedAt } = result.data;
					// Check if the autosave has actual content
					const hasContent = design.trackItemIds && design.trackItemIds.length > 0;
					if (hasContent) {
						dispatch(DESIGN_LOAD, { payload: design });
						if (savedProjectName) {
							setProjectName(savedProjectName);
						}
						if (savedRestaurant) {
							setRestaurant(savedRestaurant);
						}

						// Extract and sync media to uploads panel from autosave
						const mediaUploads = extractMediaFromDesign(design);
						syncMediaToUploads(mediaUploads);

						console.log("[Editor] Restored from autosave:", savedAt);
					}
				}
			} catch (error) {
				console.log("[Editor] No autosave to restore or fetch failed:", error);
			}
		};

		loadDesignFromSource();
	}, []);

	useEffect(() => {
		setCompactFonts(getCompactFontData(FONTS));
		setFonts(FONTS);
	}, []);

	useEffect(() => {
		loadFonts([
			{
				name: SECONDARY_FONT,
				url: SECONDARY_FONT_URL,
			},
		]);
	}, []);

	useEffect(() => {
		const screenHeight = window.innerHeight;
		const desiredHeight = 300;
		const percentage = (desiredHeight / screenHeight) * 100;
		timelinePanelRef.current?.resize(percentage);
	}, []);

	const handleTimelineResize = () => {
		const timelineContainer = document.getElementById("timeline-container");
		if (!timelineContainer) return;

		timeline?.resize(
			{
				height: timelineContainer.clientHeight - 90,
				width: timelineContainer.clientWidth - 40,
			},
			{
				force: true,
			},
		);

		// Trigger zoom recalculation when timeline is resized
		setTimeout(() => {
			sceneRef.current?.recalculateZoom();
		}, 100);
	};

	useEffect(() => {
		const onResize = () => handleTimelineResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [timeline]);

	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			} else console.log(transitionsMap[id]);
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap]);

	useEffect(() => {
		setFloatingControl("");
		setLabelControlItem("");
		setTypeControlItem("");
	}, [isLargeScreen]);

	useEffect(() => {
		setLoaded(true);
	}, []);

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden">
			<Navbar
				projectName={projectName}
				user={null}
				stateManager={stateManager}
				setProjectName={setProjectName}
				autoSaveStatus={autoSaveStatus}
				onManualSave={saveNow}
			/>
			<div className="flex flex-1 overflow-hidden">
				{isLargeScreen && (
					<div className="bg-muted  flex flex-none border-r border-border/80 h-[calc(100vh-44px)]">
						<MenuList />
						<MenuItem />
					</div>
				)}
				<ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
					<ResizablePanel className="relative overflow-hidden" defaultSize={70}>
						<FloatingControl />
						<div className="flex h-full flex-1">
							{/* Sidebar only on large screens - conditionally mounted */}

							<div
								style={{
									width: "100%",
									height: "100%",
									position: "relative",
									flex: 1,
									overflow: "hidden",
								}}
							>
								<CropModal />
								<Scene ref={sceneRef} stateManager={stateManager} />
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel
						className="min-h-[50px]"
						ref={timelinePanelRef}
						defaultSize={30}
						onResize={handleTimelineResize}
					>
						{playerRef && <Timeline stateManager={stateManager} />}
					</ResizablePanel>
					{!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
					{!isLargeScreen && trackItem && <ControlItemHorizontal />}
				</ResizablePanelGroup>
				<ControlItem />
			</div>
		</div>
	);
};

export default Editor;
