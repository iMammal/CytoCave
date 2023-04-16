Introducing the NeuroCave 3D brain visualization tool demo, designed for an interactive exploration of brain regions and connectivity. This tool is being transformed for the exploration of Neurogenomics and general genomics datasets.

Built upon the original NeuroCave connectomics visualization tool, the generalized version now features 
independent glyph scaling control, side-by-side window display, and independent color coding, making it 
ideal for visualizing neurogenomic and genomic datasets.


Key new features include:

Two sets of independent glyph size control sliders for left and right view windows, allowing precise 
control over cube and sphere glyphs for the left and right view windows—perfect for comparing brain 
regions or focusing on a specific hemisphere.

![Independent Glyph Slider Control - zoom in - Sync - demo sliders](./BrainGlyphs.gif)

---

Independent glyph scaling control sliders to adjust point density and scale differences between two 
datasets displayed in separate windows.

![Allen Neurogenomics Glyph Scaling - unlock sliders - demo adjustment](./BrainGlyphs.gif)

---

Separate control over ipsilateral and contralateral connectivity edge display, enabling users to set 
edge display thresholds and focus on the most significant connections.

![Independent Hemisphere Edge Display Thresholds - select some nodes - Edge checkboxes and Sliders](./BrainEdges.gif)

---
Intragroup and intergroup connectivity edge display toggle and threshold adjustment for genomic 
datasets, ideal for examining connectivity patterns between cells, samples, brain regions, and genes.

![Allen Edge Display - Adjust edge visibility controls](./AllenEdges.gif)

---
Decoupled color code selector in the two windows for various use cases, including independent control 
of region color visibility and highlighting specific brain regions and their connectivity.

![Decoupling the color code selector for Allen Neurogenomics - Unlock Regions](./AllenDegree.gif)

---

Different color codings of the same dataset, with dual faceted views allowing selection of specific 
regions and their connections in each window under one color coding, enabling the exploration of the 
intersection of the two color codings.

Displaying different colorings of genomic datasets to draw correlations between metrics such as gene 
Module Membership and gene centrality.

Displaying complementary datasets in each window for intermodal exploration of networks, with tailored 
color codings for each specific dataset.

The search bar can be used to locate specific brain regions or genes of interest and highlight their 
connections or correlated regions in the visualization.

![Allen Search Bar - search brain regions - search genes](./AllenSearch.gif)

---

Animation amplitude and frequency control for pulsing and flashing of selected and connected nodes, 
providing a means to highlight important brain regions and their connections even when edge lines are removed.

![Animation amplitude and frequency control for pulsing and Flashing - adjust Animation and Flash Sliders](AllenAnimations.gif)

---

Visualization of large-scale spatial or single-cell omics studies, with independent glyph size and 
color coding control to adjust for differences in point density and scale when comparing and contrasting s
ingle-cell or microdissection data across different regions of the 3D embedding.

![Allen Single Cell Omics - switch to omics tab - explore](AllenOmics.gif)

---

3D platonic solid-based representation of clustering data for exploring hierarchical clustering of cell 
relationships, neuronal circuits, or gene expression patterns.

![Allen Neurogenomics Heirachical Clustering Display with 3D Platonic Solid](AllenClustering.gif)

---

Here are a few possible use cases for the NeuroCave 3D brain visualization tool:

- Explore the connectivity pattern of brain regions and genes in 3D space, with the ability to highlight
  lncRNA and mRNA expression patterns in the brain, alongside genes or brain regions of interest.

- Compare clustering algorithms such as csuWGCNA and regular WGCNA on the same dataset, exploring the
  differences in the clustering results and the gene modules identified by each algorithm.

- Explore the connectivity patterns of genes in 3D space, using different connectivity
  matricies, derived from different types of data, such as gene expression, protein-protein interaction,
  or KEGG pathway data.


![Allen Neurogenomics Overall Interactive Visualization](./AllenNeuroGenomics.gif)

---
Overall, the Neurocave 3D brain visualization tool provides a comprehensive and
interactive platform to explore and analyze complex
neurogenomic datasets by visualizing brain regions and genes in 3D space and allowing for easy comparison and
exploration of different datasets and color codings. The decoupled control of glyph size, color coding, and
edge display controls provide users with the ability to customize the visualization to their specific
research needs while the search bar and animation controls provide a means of highlighting specific genes or
brain regions of interest.