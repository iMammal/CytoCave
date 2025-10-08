| Paper | Domain | **Foundational Principles** | | | | | | | | | **Modalities** | | **Evaluation** |
|-------|---------|-----------------------------|-----------|--------|--------|-----------------|------------|---------|----------|---------------|-----------|---------------|----------------|
|  |  | Immersion | Motion | Stereo | Overview+Detail | Navigation | Clutter | Guidance | Collaboration | Usability | Multi-sensory | LLM |  |
|---------------|---------|-----------|--------|--------|-----------------|-------------|----------|----------|---------------|------------|----------------|------|-------------|
| **Cytoscape (2002)** | BioMedVis | -Not supported- | -Not supported- | -Not supported- | Multi-panel data overlays | Interactive 2D nav | Filtering & layout selection | App-based workflows | Single-user | High (bio-specific UI) | -Not supported- | -Not supported- | Extensive community testing |
| **VisANT (2004)** | BioVis | -Not supported- | -Not supported- | (Basic 3D view) | Multi-view table + network | Stepwise manual nav | Sub-network collapse | -Not supported- | -Not supported- | Moderate (Java UI) | -Not supported- | -Not supported- | Demonstrations only |
| **Pathway Studio (~2003)** | MedVis | Diagrammatic layouts | -Not supported- | -Not supported- | Curated canonical pathways | Menu-driven nav | Template control | Built-in guided workflow | Multi-user via license | Very high (biologist-friendly) | -Not supported- | -Not supported- | Commercial evaluations |
| **Gephi (2009)** | BioVis | -Not supported- | -Not supported- | -Not supported- | Real-time filters, dynamic views | Zoom + timeline nav | Force-layout simplification | -Not supported- | -Not supported- | Generic but easy | -Not supported- | -Not supported- | Benchmark studies |
| **Graphia / BioLayout (2007–2019)** | BioVis | 2D/3D GPU viz | Mouse drag | Stereo supported (optional) | 2D/3D cluster layouts | GPU accelerated | MCL clustering | -Not supported- | -Not supported- | Power-user UI | -Not supported- | -Not supported- | Demonstrations only |
| **VANTED (2005–2010s)** | BioMedVis | 2.5D metabolic maps | -Not supported- | -Not supported- | Preserves known pathways | Linked views | Minimal clutter | Data overlay guides | Single-user | Workflow-integrated | -Not supported- | -Not supported- | Demonstrations only |
| **Arena3D / Arena3DWeb (2018–)** | BioVis | 3D layer stacking | Head motion | Stereo optional | Multi-layered overview | Stack interaction | Cross-layer filters | -Not supported- | -Not supported- | Web UI | -Not supported- | -Not supported- | Demonstrations only |
| **NDEx (Network Data Exchange, 2013)** | BioVis | Web 2D viewer | -Not supported- | -Not supported- | Linked interactive nodes | Browser-based nav | Simplified graph | -Not supported- | Multi-user sharing | High web usability | -Not supported- | -Not supported- | Community platform use |
| **OmicsNet (2018)** | BioMedVis | WebGL 3D viz | -Not supported- | Stereo rendering | 3D pathway layers | Mouse interaction | Automatic filtering | Wizard-guided building | Multi-user web share | Web-based UI | -Not supported- | -Not supported- | Demonstrations only |
| **VRNetzer (Pirch, 2021)** | BioVis | VR network immersion | 6DoF head-tracked | Stereo supported (optional) | Multi-layout + subnetworks | VR nav + pathfinding | Layout filtering | Workflow guidance | Single-user | Integrated VR suite | -Not supported- | -Not supported- | Demonstrations only |
| **AIDEN (Quantin, 2024)** | BioMedVis | VR graph immersion | Head-tracked | Stereo supported (optional) | Semantic RDF queries | Voice-driven nav | NL filtering | Voice guidance | Single-user | RDF workflow | -Not supported- | LLM-assisted speech | Demonstrations only |
| **NivTA (Jia, 2024)** | MedVis | CAVE immersion | Head-tracked | Stereo supported (optional) | Educational overview | Voice/gesture nav | -Not supported- | LLM tutor guidance | Multi-user class | Education workflow | -Not supported- | LLM conversational tutor | Demonstrations only |
| **Surgical AR VCUI (Javaheri, 2024)** | MedVis | AR overlays | Head-tracked | -Not supported- | Context-aware views | Voice-controlled AR nav | -Not supported- | LLM resolves ambiguity | Multi-user OR | Clinical workflow | -Not supported- | LLM-mediated speech | **Formal study** |
| **VOICE (2023, molecular viz)** | BioVis | VR molecular env | Head-tracked | Stereo rendering | Molecule overview+detail | NL-based nav | Sparsification | LLM conversational guide | Single-user | Molecular workflow | -Not supported- | LLM conversation | **Expert evaluation** |
| **NeuroCave (Keiriz, 2018)** | BioMedVis | CAVE/web connectome | Head-tracked | Stereo rendering | Comparative views | Interactive nav | Edge bundling | -Not supported- | Shared CAVE | Web-based workflow | -Not supported- | -Not supported- | Demonstrations only |
| **FathomGPT (Khanal, 2024)** | BioVis | -Not supported- | -Not supported- | -Not supported- | Interactive charts/maps | NL-based nav | NL filters | Conversational explanations | -Not supported- | Workflow (FathomNet) | -Not supported- | LLM text-to-code | Ablation + expert study |

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

