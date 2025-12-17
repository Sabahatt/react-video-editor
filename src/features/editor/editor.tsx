"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import useKeyboardShortcuts from "./hooks/use-keyboard-shortcuts";
import usePlayheadSnap from "./hooks/use-playhead-snap";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState, useCallback, memo } from "react";
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
import { usePipelineStore } from "@/store/use-pipeline-store";
import { PipelineProgressPanel } from "@/components/pipeline/pipeline-progress-panel";
import { EditorLockedOverlay } from "@/components/pipeline/editor-locked-overlay";
import { useRouter } from "next/navigation";

// Use individual selectors to prevent unnecessary re-renders
const selectTimeline = (state: ReturnType<typeof useStore.getState>) => state.timeline;
const selectPlayerRef = (state: ReturnType<typeof useStore.getState>) => state.playerRef;
const selectActiveIds = (state: ReturnType<typeof useStore.getState>) => state.activeIds;
const selectTrackItemsMap = (state: ReturnType<typeof useStore.getState>) => state.trackItemsMap;

const stateManager = new StateManager({
	size: {
		width: 1920,
		height: 1080,
	},
});

const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
	const router = useRouter();
	const [projectName, setProjectName] = useState<string>("Untitled video");
	const [restaurant, setRestaurant] = useState<string>("default");
	const { scene } = useSceneStore();
	const timelinePanelRef = useRef<ImperativePanelHandle>(null);
	const sceneRef = useRef<SceneRef>(null);

	// Use individual selectors to minimize re-renders
	const timeline = useStore(selectTimeline);
	const playerRef = useStore(selectPlayerRef);
	const activeIds = useStore(selectActiveIds);
	const trackItemsMap = useStore(selectTrackItemsMap);
	const [loaded, setLoaded] = useState(false);
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const {
		setTrackItem: setLayoutTrackItem,
		setFloatingControl,
		setLabelControlItem,
		setTypeControlItem,
		setShowToolboxItem,
		setActiveToolboxItem,
	} = useLayoutStore();
	const isLargeScreen = useIsLargeScreen();

	// Pipeline store
	const {
		isGenerating,
		isComplete,
		error: pipelineError,
		restaurant: pipelineRestaurant,
		template: pipelineTemplate,
		brand: pipelineBrand,
		script: pipelineScript,
		updateStep,
		setDesign,
		setScript,
		setError: setPipelineError,
		completePipeline,
		resetPipeline,
	} = usePipelineStore();

	const pipelineRanRef = useRef(false);
	const designLoadedRef = useRef(false);

	// Auto-save functionality - saves every 30 seconds
	const { status: autoSaveStatus, saveNow } = useAutoSave({
		stateManager,
		restaurant,
		projectName,
		brand: pipelineBrand,
		script: pipelineScript,
		intervalMs: 30000, // 30 seconds
		enabled: true,
	});

	useTimelineEvents();
	useKeyboardShortcuts();
	usePlayheadSnap();

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
			}
		}
	};

	useEffect(() => {
		const loadDesignFromSource = async () => {
			// Prevent loading multiple times
			if (designLoadedRef.current) {
				return;
			}

			// Read current state directly from store to avoid stale closures
			const pipelineState = usePipelineStore.getState();

			// If pipeline is active or just completed, don't load from other sources
			// Pipeline will handle loading the design itself
			if (pipelineState.isGenerating || pipelineState.isComplete) {
				return;
			}

			// Try to load generated design from sessionStorage first (legacy support)
			const storedDesign = sessionStorage.getItem("generatedDesign");
			if (storedDesign) {
				try {
					const design = JSON.parse(storedDesign);
					dispatch(DESIGN_LOAD, { payload: design });

					// Extract and sync media to uploads panel
					const mediaUploads = extractMediaFromDesign(design);
					syncMediaToUploads(mediaUploads);

					// Extract restaurant name for auto-save folder and set brand in store
					const storedBrand = sessionStorage.getItem("generatedBrand");
					if (storedBrand) {
						try {
							const brand = JSON.parse(storedBrand);
							// Set brand in pipeline store for context-aware stock search
							setDesign(design, brand);
							if (brand.restaurantName || brand.name) {
								const brandName = brand.restaurantName || brand.name;
								// Convert to folder-safe name
								const safeName = brandName
									.toLowerCase()
									.replace(/[^a-z0-9]+/g, '-')
									.replace(/^-|-$/g, '');
								setRestaurant(safeName || 'default');
								setProjectName(brandName + ' Ad');
							}
						} catch (e) {
							console.error("Failed to parse brand for restaurant name:", e);
						}
					}

					// Clear sessionStorage after loading
					sessionStorage.removeItem("generatedDesign");
					sessionStorage.removeItem("generatedBrand");
					sessionStorage.removeItem("generatedScript");
					designLoadedRef.current = true;
					return; // Successfully loaded from sessionStorage
				} catch (error) {
					console.error("Failed to parse stored design:", error);
				}
			}

			// No sessionStorage design - try to load from autosave
			// Use localStorage to get the last used restaurant, fallback to 'default'
			const lastRestaurant = localStorage.getItem('lastAutosaveRestaurant') || 'default';

			try {
				const response = await fetch(`/api/autosave?restaurant=${lastRestaurant}`);
				const result = await response.json();

				if (result.success && result.data?.design) {
					const { design, projectName: savedProjectName, restaurant: savedRestaurant, brand: savedBrand, script: savedScript } = result.data;
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

						// Load brand data: prefer saved brand from autosave, fallback to API
						let brandToUse = savedBrand;
						// Try to fetch brand from API if not in autosave
						// Use savedRestaurant from autosave, or lastRestaurant from localStorage as fallback
						const restaurantForBrand = (savedRestaurant && savedRestaurant !== 'default')
							? savedRestaurant
							: (lastRestaurant !== 'default' ? lastRestaurant : null);

						if (!brandToUse && restaurantForBrand) {
							try {
								const brandRes = await fetch(`/api/poc-data/brand?restaurant=${restaurantForBrand}`);
								const brandResult = await brandRes.json();
								if (brandResult.success && brandResult.brand) {
									brandToUse = brandResult.brand;
								}
							} catch (brandErr) {
								// Ignore brand fetch errors
							}
						}
						if (brandToUse) {
							setDesign(design, brandToUse);
						}

						// Restore script from autosave to pipeline store
						if (savedScript) {
							setScript(savedScript);
						}

						// Extract and sync media to uploads panel from autosave
						const mediaUploads = extractMediaFromDesign(design);
						syncMediaToUploads(mediaUploads);

						designLoadedRef.current = true;
					}
				}
			} catch (error) {
			}
		};

		loadDesignFromSource();
	}, []); // Run once on mount - reads current state from store directly

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

		// Trigger initial resize when timeline becomes available to fix scroll visibility
		if (timeline) {
			requestAnimationFrame(() => {
				handleTimelineResize();
			});
		}

		return () => window.removeEventListener("resize", onResize);
	}, [timeline]);

	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			}
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
			// Reset toolbox when nothing is selected
			setShowToolboxItem(false);
			setActiveToolboxItem(null);
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

	// Pipeline simulation - runs when coming from landing page with generation active
	useEffect(() => {
		const runPipeline = async () => {
			// Only run if pipeline is generating and hasn't already run
			if (!isGenerating || pipelineRanRef.current || !pipelineRestaurant || !pipelineTemplate) {
				return;
			}

			pipelineRanRef.current = true;

			try {
				// Step 1: Analyzing website
				updateStep(0, "active");
				await simulateDelay(1000);
				updateStep(0, "complete");

				// Step 2: Extracting brand data
				updateStep(1, "active");
				await simulateDelay(1400);
				updateStep(1, "complete");

				// Step 3: Generating AI script
				updateStep(2, "active");
				await simulateDelay(1800);
				updateStep(2, "complete");

				// Step 4: Building timeline (fetch the pre-made ad)
				updateStep(3, "active");
				await simulateDelay(1000);

				const adRes = await fetch(`/api/poc-data/ads?restaurant=${pipelineRestaurant}&template=${pipelineTemplate}`);
				const adResult = await adRes.json();

				if (!adResult.success) {
					throw new Error(adResult.error || "Failed to load ad template");
				}

				updateStep(3, "complete");

				// Step 5: Finalizing
				updateStep(4, "active");
				await simulateDelay(800);
				updateStep(4, "complete");

				// Store the design data
				setDesign(adResult.design, adResult.brand);

				// Small delay for visual feedback
				await simulateDelay(500);

				// Load the design into the editor
				dispatch(DESIGN_LOAD, { payload: adResult.design });
				designLoadedRef.current = true;

				// Extract and sync media
				const mediaUploads = extractMediaFromDesign(adResult.design);
				syncMediaToUploads(mediaUploads);

				// Set project name from brand
				if (adResult.brand?.restaurantName) {
					const safeName = adResult.brand.restaurantName
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-|-$/g, '');
					setRestaurant(safeName || 'default');
					setProjectName(adResult.brand.restaurantName + ' Ad');
				}

				// Complete the pipeline
				completePipeline();

				// Immediate save to persist brand data
				setTimeout(() => saveNow(), 500);

			} catch (err) {
				console.error("[Pipeline] Error:", err);
				setPipelineError(err instanceof Error ? err.message : "An error occurred");
			}
		};

		runPipeline();
	}, [isGenerating, pipelineRestaurant, pipelineTemplate]);

	// Handler to return to homepage on pipeline error
	const handleReturnToHome = useCallback(() => {
		resetPipeline();
		router.push("/");
	}, [resetPipeline, router]);

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden relative">
			{/* Ambient gradient background - matching landing page */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{/* Primary coral glow - top right */}
				<div
					className="absolute w-[600px] h-[600px] rounded-full opacity-[0.15] blur-[120px] animate-float-slow"
					style={{
						background: "radial-gradient(circle, #fb923c 0%, transparent 70%)",
						top: "-10%",
						right: "10%",
					}}
				/>
				{/* Secondary pink glow - bottom left */}
				<div
					className="absolute w-[500px] h-[500px] rounded-full opacity-[0.12] blur-[100px] animate-float-slower"
					style={{
						background: "radial-gradient(circle, #f472b6 0%, transparent 70%)",
						bottom: "0%",
						left: "-5%",
					}}
				/>
				{/* Accent warm glow - center */}
				<div
					className="absolute w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[80px] animate-float-medium"
					style={{
						background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)",
						top: "40%",
						left: "30%",
					}}
				/>
			</div>

			{/* Pipeline locked overlay */}
			<EditorLockedOverlay />

			{/* Pipeline progress panel */}
			<PipelineProgressPanel onRetry={handleReturnToHome} />

			<Navbar
				projectName={projectName}
				user={null}
				stateManager={stateManager}
				setProjectName={setProjectName}
				autoSaveStatus={autoSaveStatus}
				onManualSave={saveNow}
				isReady={loaded}
			/>
			<div className="flex flex-1 overflow-hidden">
				{isLargeScreen && (
					<div className="glass-panel-darker flex flex-none h-[calc(100vh-44px)]">
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
