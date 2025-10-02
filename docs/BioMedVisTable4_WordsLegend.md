| Paper | Immersion | Motion | Stereo | Overview+Detail | Navigation | Clutter | Guidance | Collaboration | Multi-sensory | Usability | LLM | Evaluation |
|-------|-----------|--------|--------|-----------------|------------|---------|----------|---------------|---------------|-----------|-----|------------|
| **transomics2cytoscape (2014)** | -Not supported- | -Not supported- | -Not supported- | Layered 2.5D pathway views | Panel-driven exploration | Plane stacking reduces overlap | -Not supported- | -Not supported- | -Not supported- | Automates 2.5D integration with Cytoscape | -Not supported- | -Not supported- |
| **VRNetzer (Pirch, 2021)** | HMD immersive VR networks | 6DoF head-tracked nav | Stereo supported (optional) | Multi-layout + subnetworks | VR nav with shortest paths | Layout + subgraph filtering | Task workflows as guides | Single-user (no collab) | -Not supported- | Integrated VR analysis platform | -Not supported- | -Not supported- |
| **CellexalVR (Legetth, 2021)** | VR for single-cell DR plots | Head + controller nav | Stereo rendering | Global DR + local clusters | Gesture selection, lassoing | Subsampling + metadata filters | Session flow guides exploration | Multi-user supported | -Not supported- | Pipelines + easy export | -Not supported- | Demonstrations only (case demos) |
| **Corvo (Hyman, 2022)** | VR exploration of embeddings | Head-tracked VR nav | Stereo supported (optional) | Overview of embeddings + local probes | No-code VR navigation | Filter/brush across embeddings | Guided VR analysis steps | Single-user (no collab) | -Not supported- | No-code workflow integration | -Not supported- | Demonstrations only |
| **MiCellAnnGELo (Platt, 2022)** | VR on 3D cell surfaces | Precision head-tracked nav | Stereo supported (optional) | Whole-cell surface + ROIs | 3D selection + annotation | Focus on surface ROIs | Protocol-driven annotation | Single-user (no collab) | -Not supported- | Unity app with labeling integration | -Not supported- | Demonstrations only |
| **BrainX3 (Betella, 2014)** | CAVE/HMD immersion | Head-tracked S3D | Stereo rendering | Global brain with local regions | Embodied navigation tools | Region filtering + multimodal cues | -Not supported- | Single-user (no collab) | Sonification for edges/nodes | Prototype system | -Not supported- | Demonstrations only |
| **3D Renal Network (Bhavnani, 2010)** | CAVE S3D | Head-tracked | Stereo rendering | Disease–gene overview with local focus | Walk-through exploration | Spatial separation in CAVE | -Not supported- | Single-user (no collab) | -Not supported- | Early prototype system | -Not supported- | -Not supported- |
| **PPI VR (Aouaa, 2018)** | VR protein-protein networks | VR motion navigation | Stereo supported (optional) | PPI overview + clusters | Interactive VR mining tools | Cluster/subnet focus | -Not supported- | Single-user (no collab) | -Not supported- | Case-study prototype | -Not supported- | -Not supported- |
| **Hybrid-Dim (Sommer, 2015)** | Semi-immersive zSpace + CAVE | Head-tracked nav | Stereo rendering | Stereo overview + immersive detail | Linked display interaction | Hybrid 2.5D/3D occlusion control | Structured analysis across displays | Single-user (no collab) | -Not supported- | Workflow bridging 2D↔VR | -Not supported- | Demonstrations only |
| **VR + CmPI/VANTED (Sommer & Schreiber, 2016)** | zSpace + CAVE hybrid | Head-tracked nav | Stereo rendering | Linked overview and detail | Cross-display linking + selection | Overview+detail split | Linked pipeline steps | Single-user (no collab) | -Not supported- | Workflow bridging 2D↔VR | -Not supported- | Demonstrations only |
| **VisNEST (Nowke, 2013)** | Immersive network inspection | Head-tracked nav | Stereo supported (optional) | Network overview + neurons | Neuron selection, spike data | Selective focus on neurons | -Not supported- | Single-user (no collab) | -Not supported- | System integration prototype | -Not supported- | -Not supported- |
| **Immersive Brain Conn. (Pester, 2021)** | VR brain connectivity | Head-tracked nav | Stereo supported (optional) | Whole-brain ↔ regional drill-down | Navigate connectivity layers | Modal separation of connectivity | -Not supported- | Single-user (no collab) | -Not supported- | Demonstration platform | -Not supported- | -Not supported- |
| **AIDEN (Quantin, 2024)** | VR graph immersion | Head-tracked nav | Stereo supported (optional) | Semantic graph overview + queries | Voice-driven graph navigation | Filter via NL queries | Voice-based query guidance | Single-user (no collab) | -Not supported- | RDF ontology workflow integration | LLM-assisted speech queries | Demonstrations only |
| **NivTA (Jia, 2024)** | CAVE immersion | Head-tracked nav | Stereo supported (optional) | Educational content overview | Voice/gesture navigation | -Not supported- | LLM-based teaching assistant | Multi-user CAVE class | -Not supported- | Education-focused workflow | LLM conversational tutor | Demonstrations only |
| **Surgical AR VCUI (Javaheri, 2024)** | AR immersion | Head-tracked AR nav | -Not supported- | Surgical overlay detail + context | Voice-controlled overlays | -Not supported- | LLM resolves ambiguous commands | Multi-user OR team | -Not supported- | Integrated into surgical workflow | LLM-mediated speech control | **Formal study** – surgeons: task time ↓, workload ↓ [[Javaheri 2024]] |
| **VOICE (2023, molecular viz)** | VR molecular viz | Head-tracked VR nav | Stereo rendering | Molecular overview + details | Conversational NL navigation | Sparsification in dense scenes | LLM conversational guide | Single-user (no collab) | -Not supported- | Integrated into molecular workflow | LLM-mediated NL conversation | **Expert evaluation** – educators, molecular scientists [[VOICE 2023]] |


---

### Legend: Principles with Descriptions & Citations

- **Immersion** – Immersive 3D/VR improves comprehension of complex networks & clusters; room-scale VR reduces errors vs. 2D. (Ware & Franck, 1996; Alper & Forbes, 2010)  
- **Motion** – Head-tracking & parallax cues reduce errors more than stereo alone in network tracing tasks. (Ware & Franck, 1996; Ware & Mitchell, 2008)  
- **Stereo** – Stereo depth helps in complex/overlapping structures but can add time cost; stereo highlighting aids counting tasks. (Kraus et al., 2005; Yang et al., 2018)  
- **Overview+Detail** – Providing overview + drill-down aids accuracy and reduces cognitive load. (Poco et al., 2011; Sanftmann & Weiskopf, 2015)  
- **Navigation** – Navigation design (walking/zoom/overview) changes accuracy & speed; rigid-body transitions aid object tracking. (Poco et al., 2011; Kraus et al., 2005)  
- **Clutter** – Managing clutter (layering, sparsification) improves accuracy; naive 3D can harm performance. (Sanftmann & Weiskopf, 2015)  
- **Guidance** – Guided tours and narrative techniques reduce cognitive load and boost comprehension. (Hullman & Diakopoulos, 2011)  
- **Collaboration** – Multi-user collaborative immersive analytics increases value for complex data. (Isenberg et al., 2013)  
- **Multi-sensory** – Audio/haptics augment visual grouping & depth perception. (Betella et al., 2014)  
- **Usability** – Tools fitting analyst workflows increase uptake; end-to-end reduces barriers. (Sedlmair et al., 2012)
- **LLM** – Natural language processing & LLMs enable conversational interaction, disambiguation, and guidance. Systems without this are marked -Not supported-. (VOICE 2023; Javaheri 2024; Quantin 2024; Jia 2024)
- **Evaluation** – Controlled studies confirm principles: stereo+motion ↓ errors; VR aids cluster tasks; nav design affects outcomes. (Multiple studies cited)  

**Evaluation** –

**Formal study** = controlled experiment with metrics (e.g., Javaheri 2024 surgical AR VCUI, task time/workload improvements).

**Expert evaluation** = limited domain expert feedback (e.g., VOICE 2023 molecular viz).

**Demonstrations only** = case demos or prototypes without user studies (AIDEN, NivTA, CellexalVR, etc.).

**-Not supported-** = no evaluation reported.
