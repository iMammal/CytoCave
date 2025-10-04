| Paper | Domain | **Foundational Principles** | | | | | | | | | **Modalities** | | **Evaluation** |
|-------|---------|-----------------------------|-----------|--------|--------|-----------------|------------|---------|----------|---------------|-----------|---------------|----------------|
|       |         | Immersion | Motion | Stereo | Overview+Detail | Navigation | Clutter | Guidance | Collaboration | Usability | Multi-sensory | LLM | Evaluation |
| **transomics2cytoscape (2014)** | BioVis | -Not supported- | -Not supported- | -Not supported- | Layered 2.5D pathway views | Panel-driven exploration | Plane stacking reduces overlap | -Not supported- | -Not supported- | Automates 2.5D integration with Cytoscape | -Not supported- | -Not supported- | -Not supported- |
| **VRNetzer (Pirch, 2021)** | BioVis | HMD immersive VR networks | 6DoF head-tracked nav | Stereo supported (optional) | Multi-layout + subnetworks | VR nav with shortest paths | Layout + subgraph filtering | Task workflows as guides | Single-user (no collab) | Integrated VR analysis platform | -Not supported- | -Not supported- | -Not supported- |
| **CellexalVR (Legetth, 2021)** | BioVis | VR for single-cell DR plots | Head + controller nav | Stereo rendering | Global DR + local clusters | Gesture selection, lassoing | Subsampling + metadata filters | Session flow guides exploration | Multi-user supported | Pipelines + easy export | -Not supported- | -Not supported- | Demonstrations only |
| **Corvo (Hyman, 2022)** | MedVis | VR exploration of embeddings | Head-tracked VR nav | Stereo supported (optional) | Overview of embeddings + local probes | No-code VR navigation | Filter/brush across embeddings | Guided VR analysis steps | Single-user (no collab) | No-code workflow integration | -Not supported- | -Not supported- | Demonstrations only |
| **MiCellAnnGELo (Platt, 2022)** | BioMedVis | VR on 3D cell surfaces | Precision head-tracked nav | Stereo supported (optional) | Whole-cell surface + ROIs | 3D selection + annotation | Focus on surface ROIs | Protocol-driven annotation | Single-user (no collab) | Unity app with labeling integration | -Not supported- | -Not supported- | Demonstrations only |
| **BrainX3 (Betella, 2014)** | BioMedVis | CAVE/HMD immersion | Head-tracked S3D | Stereo rendering | Global brain with local regions | Embodied navigation tools | Region filtering + multimodal cues | -Not supported- | Single-user (no collab) | Prototype system | Sonification for edges/nodes | -Not supported- | Demonstrations only |
| **3D Renal Network (Bhavnani, 2010)** | BioMedVis | CAVE S3D | Head-tracked | Stereo rendering | Disease–gene overview with local focus | Walk-through exploration | Spatial separation in CAVE | -Not supported- | Single-user (no collab) | Early prototype system | -Not supported- | -Not supported- | -Not supported- |
| **PPI VR (Aouaa, 2018)** | BioVis | VR protein-protein networks | VR motion navigation | Stereo supported (optional) | PPI overview + clusters | Interactive VR mining tools | Cluster/subnet focus | -Not supported- | Single-user (no collab) | Case-study prototype | -Not supported- | -Not supported- | -Not supported- |
| **Hybrid-Dim (Sommer, 2015)** | BioVis | Semi-immersive zSpace + CAVE | Head-tracked nav | Stereo rendering | Stereo overview + immersive detail | Linked display interaction | Hybrid 2.5D/3D occlusion control | Structured analysis across displays | Single-user (no collab) | Workflow bridging 2D↔VR | -Not supported- | -Not supported- | Demonstrations only |
| **VR + CmPI/VANTED (Sommer & Schreiber, 2016)** | BioVis | zSpace + CAVE hybrid | Head-tracked nav | Stereo rendering | Linked overview and detail | Cross-display linking + selection | Overview+detail split | Linked pipeline steps | Single-user (no collab) | Workflow bridging 2D↔VR | -Not supported- | -Not supported- | Demonstrations only |
| **VisNEST (Nowke, 2013)** | BioVis | Immersive network inspection | Head-tracked nav | Stereo supported (optional) | Network overview + neurons | Neuron selection, spike data | Selective focus on neurons | -Not supported- | Single-user (no collab) | System integration prototype | -Not supported- | -Not supported- | -Not supported- |
| **Immersive Brain Conn. (Pester, 2021)** | BioMedVis | VR brain connectivity | Head-tracked nav | Stereo supported (optional) | Whole-brain ↔ regional drill-down | Navigate connectivity layers | Modal separation of connectivity | -Not supported- | Single-user (no collab) | Demonstration platform | -Not supported- | -Not supported- | -Not supported- |
| **AIDEN (Quantin, 2024)** | BioMedVis | VR graph immersion | Head-tracked nav | Stereo supported (optional) | Semantic graph overview + queries | Voice-driven graph navigation | Filter via NL queries | Voice-based query guidance | Single-user (no collab) | RDF ontology workflow integration | -Not supported- | LLM-assisted speech queries | Demonstrations only |
| **NivTA (Jia, 2024)** | MedVis | CAVE immersion | Head-tracked nav | Stereo supported (optional) | Educational content overview | Voice/gesture navigation | -Not supported- | LLM-based teaching assistant | Multi-user CAVE class | Education-focused workflow | -Not supported- | LLM conversational tutor | Demonstrations only |
| **Surgical AR VCUI (Javaheri, 2024)** | MedVis | AR immersion | Head-tracked AR nav | -Not supported- | Surgical overlay detail + context | Voice-controlled overlays | -Not supported- | LLM resolves ambiguous commands | Multi-user OR team | Integrated into surgical workflow | -Not supported- | LLM-mediated speech control | **Formal study** – surgeons: task time ↓, workload ↓ |
| **VOICE (2023, molecular viz)** | BioVis | VR molecular viz | Head-tracked VR nav | Stereo rendering | Molecular overview + details | Conversational NL navigation | Sparsification in dense scenes | LLM conversational guide | Single-user (no collab) | Integrated into molecular workflow | -Not supported- | LLM-mediated NL conversation | **Expert evaluation** – educators & scientists |
| **NeuroCave (Keiriz, 2018)** | BioMedVis | CAVE/web immersive connectome viz | Head-tracked VR/desktop nav | Stereo rendering (HMDs) | Side-by-side comparisons; module clustering | Interactive VR nav; switch topologies | Edge bundling + interactive layout | -Not supported- | Single-user (shared CAVE view) | Web-based; load your own data | -Not supported- | -Not supported- | Demonstrations only |
| **FathomGPT (Khanal, 2024)** | BioVis | -Not supported- | -Not supported- | -Not supported- | On-demand interactive charts/maps | NL commands for retrieval/filtering | NL filters; name resolution aids | Conversational explanations | -Not supported- | Optimized latency; domain workflow (FathomNet) | -Not supported- | LLM text-to-SQL/code; image/pattern search | Ablation studies + expert feedback |


---

### Legend

#### **Scope and Domain Categories**
- **BioVis** – Visualization of *biological systems and data*, including molecular, cellular, ecological, genomic, and connectomic contexts (e.g., CellexalVR, BrainX3, FathomGPT).  
- **MedVis** – Visualization for *medical, clinical, or anatomical* analysis, diagnosis, surgery, or training (e.g., Surgical AR VCUI, NivTA).  
- **BioMedVis** – Systems at the *intersection* of biological and medical visualization, often translating biological data or structures to clinical or educational contexts (e.g., NeuroCave, AIDEN, MiCellAnnGELo).  

> *This review adopts the union of BioVis and MedVis domains, including their overlap (BioMedVis), to reflect converging visualization practices across biological and medical sciences.*

---

#### **Foundational Principles**
Derived from empirical visualization research and supported by controlled user studies.  
These define the cognitive and perceptual design factors common across BioVis and MedVis applications.

| Principle | Description | Representative Studies |
|------------|--------------|------------------------|
| **Immersion** | 3D/VR immersion enhances comprehension of complex spatial structures and clusters; however, its benefit is task-dependent. | Ware & Franck (1996); Alper & Forbes (2010) |
| **Motion** | Head-tracking and motion parallax reduce spatial-reasoning errors more than static stereo alone. | Ware & Franck (1996); Ware & Mitchell (2008) |
| **Stereo** | Stereo depth aids in disentangling overlaps but may increase time cost; optimal when user-controlled or optional. | Kraus et al. (2005); Yang et al. (2018) |
| **Overview + Detail** | Providing global overviews with drill-down detail reduces cognitive load and improves accuracy. | Poco et al. (2011); Sanftmann & Weiskopf (2015) |
| **Navigation** | Navigation style (walking, zooming, overview panels) affects speed and accuracy; smooth transitions preserve context. | Poco et al. (2011); Kraus et al. (2005) |
| **Clutter** | Managing occlusion through layering, filtering, or sparsification improves accuracy; naïve 3D can hinder performance. | Sanftmann & Weiskopf (2015) |
| **Guidance** | Narrative cues, guided tours, or workflow steps lower cognitive burden and aid interpretation. | Hullman & Diakopoulos (2011) |
| **Collaboration** | Multi-user or shared immersive environments increase analytical value and engagement. | Isenberg et al. (2013) |
| **Usability** | Tools aligned with domain workflows increase adoption and sustained use. | Sedlmair et al. (2012) |

---

#### **Modalities / Technology Layers**
These are *delivery mechanisms* rather than cognitive principles.  
They represent how visualization systems extend interaction beyond visual channels.

| Modality | Description | Representative Studies |
|-----------|--------------|------------------------|
| **Multi-sensory** | Augments visual information with audio or haptic feedback to reinforce grouping and spatial cues. | Betella et al. (2014) |
| **LLM Integration** | Incorporates natural-language or large-language-model interaction for querying, navigation, or explanation (e.g., conversational VR assistants, voice-controlled AR). | Quantin et al. (2024); Jia et al. (2024); Javaheri et al. (2024); VOICE (2023) |

> *Modalities are context-dependent; they can enhance usability or accessibility but are not universally required for visualization effectiveness.*

---

#### **Evaluation Categories**
Indicates the level of empirical validation reported by each system.

| Label | Meaning |
|--------|---------|
| **Formal study** | Controlled quantitative or mixed-methods evaluation measuring task performance, accuracy, or cognitive load. |
| **Expert evaluation** | Qualitative feedback or heuristic testing by domain specialists without statistical analysis. |
| **Demonstrations only** | Descriptive case studies or proofs of concept without user evaluation. |
| **– Not supported –** | No evaluation or validation information reported. |

---

#### **Interpretive Notes**
- Cells showing *“Stereo supported (optional)”* indicate systems that **allow switching** between 2D and stereo modes, considered *supportive* rather than partial compliance.  
- *Single-user (no collab)* marks systems designed for individual exploration but potentially extensible to multi-user modes.  
- Systems integrating **LLM or speech interfaces** (AIDEN, NivTA, Surgical AR VCUI, VOICE, FathomGPT) are highlighted as early exemplars of conversational visualization.  
- The **Evaluation** cluster shows that, across both BioVis and MedVis, empirical validation of immersive and LLM features remains limited — a gap this review identifies for future research.

---

### **Summary**
This table and legend jointly map the evolution of visualization design from **foundational perceptual principles** toward **AI-augmented and multimodal interaction paradigms** across BioVis, MedVis, and BioMedVis domains.

