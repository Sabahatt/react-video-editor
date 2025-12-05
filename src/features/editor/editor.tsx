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

const stateManager = new StateManager({
	size: {
		width: 1920,
		height: 1080,
	},
});

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
	const [projectName, setProjectName] = useState<string>("Untitled video");
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

	useTimelineEvents();
	useKeyboardShortcuts();

	const { setCompactFonts, setFonts } = useDataState();

	const { setUploads, uploads: existingUploads } = useUploadStore();

	useEffect(() => {
		// Try to load generated design from sessionStorage
		const storedDesign = sessionStorage.getItem("generatedDesign");
		if (storedDesign) {
			try {
				const design = JSON.parse(storedDesign);
				dispatch(DESIGN_LOAD, { payload: design });

				// Extract media from design and add to uploads for the media panel
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
								id: `generated_${item.id}`,
								url: item.details.src,
								type: "video",
								// For videos, use preview image if available (from Pexels)
								preview: item.metadata?.previewUrl,
								metadata: {
									alt: item.metadata?.alt || "Generated video",
									uploadedUrl: item.details.src,
									previewUrl: item.metadata?.previewUrl,
								},
							});
						} else if (item.type === "image" && item.details?.src) {
							mediaUploads.push({
								id: `generated_${item.id}`,
								url: item.details.src,
								type: "image",
								metadata: {
									alt: item.metadata?.alt || "Generated image",
									uploadedUrl: item.details.src,
								},
							});
						}
					});
				}

				// Add unique media to uploads (avoid duplicates)
				if (mediaUploads.length > 0) {
					const existingUrls = new Set(existingUploads.map((u: any) => u.url));
					const newUploads = mediaUploads.filter((u) => !existingUrls.has(u.url));
					if (newUploads.length > 0) {
						setUploads([...existingUploads, ...newUploads]);
					}
				}

				// Clear sessionStorage after loading
				sessionStorage.removeItem("generatedDesign");
				sessionStorage.removeItem("generatedBrand");
				sessionStorage.removeItem("generatedScript");
				console.log("Loaded generated design from sessionStorage");
			} catch (error) {
				console.error("Failed to parse stored design:", error);
			}
		}
		// If no stored design, editor starts empty (user can add items manually)
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
