Presenting the NeuroCave 3D brain visualization tool. Originally designed for interactive exploration 
of brain regions and connectivity, here, it is being transformed  to facilitate the exploration of 
Neurogenomics and general genomics datasets. The generalized version now features 
independent glyph scaling control, independent hemisphere or other group edge display, and independent 
color coding, controllable animations, and a search box, enhancing its utility for visualizing 
neurogenomic and genomic datasets.


Key new features:

Two sets of independent glyph size control sliders for left and right view windows allow users to 
control sizes of cube and sphere glyphs for the left and right view windows for comparing brain 
regions or focusing on a specific hemisphere.

![Independent Glyph Slider Control - zoom in - Sync - demo sliders](./BrainGlyphs.gif)

---

This feature allows users to view two different datasets simultaneously in the windows, enabling them to compensate
for point density and scale variations on the fly.

![Allen Neurogenomics Glyph Scaling - unlock sliders - demo adjustment](./AllenGlyphs.gif)

---

Separate control of ipsilateral and contralateral connectivity edge display gives users more 
control over the edge visibility thresholds allowing them to focus on the most significant connections
or get a general sense of the connectivity patterns.

![Independent Hemisphere Edge Display Thresholds - select some nodes - Edge checkboxes and Sliders](./BrainEdges.gif)

---
Intragroup and intergroup connectivity edge display toggle and threshold adjustment for examining 
connectivity patterns between cells, samples, brain regions, and genes in genomic datasets.

![Allen Edge Display - Adjust edge visibility controls](./AllenEdges.gif)

---
Decoupling the color code selectors in the two windows allows for various use cases, including independent control 
of region color visibility and highlighting specific brain regions and their connectivity.

![Decoupling the color code selector for Allen Neurogenomics - Unlock Regions](./AllenDegree.gif)

- Different color codings of the same dataset, with dual faceted views allowing selection of specific 
regions and their connections in each window to explore the intersections between the two color codings.

- Displaying different colorings of genomic datasets to draw correlations between metrics such as gene 
Module Membership and gene centrality.

- Displaying complementary datasets in each window for intermodal exploration of networks, with customized 
color codings for each dataset.

---

The search bar can be used to locate specific brain regions or genes of interest and highlight their 
connections or correlated regions in the visualization.

![Allen Search Bar - search brain regions - search genes](./AllenSearch.gif)

---

Animation amplitude and frequency control for pulsing and flashing of selected and connected nodes 
provides a means to highlight important brain regions and their connections, even when edge lines 
are be removed to reduce crossing clutter. (This is done with the opacity slider.)

![Animation amplitude and frequency control for pulsing and Flashing - adjust Animation and Flash Sliders](AllenAnimations.gif)

---

The original 3D platonic solid-based representation of clustering data is also useful for exploring 
the hierarchical clustering of cell relationships or gene expression patterns as well as neuronal circuits.

![Allen Neurogenomics Heirachical Clustering Display with 3D Platonic Solid](AllenClustering.gif)

---

Here are a few possible use cases for the new version of NeuroCave:

- Exploration of the connectivity pattern of brain regions and genes in 3D space, with the ability to highlight
  specially annotated gene types such as gene fusions, lncRNA, circRNA and protein coding mRNA expression patterns 
  in the brain, alongside the brain regions of interest in which they are expressed.

![Allen Neurogenomics Overall Interactive Visualization](./AllenNeuroGenomics.gif)

- Visualization of large-scale spatial or single-cell omics studies, with independent glyph size 
and color coding control to adjust for differences in point density and scale when comparing and 
contrasting single-cell or microdissection data across different regions of the 3D embedding.

![Allen Single Cell Omics - switch to omics tab - explore](AllenOmics.gif)

- Comparison between clustering algorithms such as Louvain, PLACE and WGCNA on the same dataset, exploring the
  differences in the clustering results and the gene modules identified by each algorithm.

- Exploration of the connectivity patterns of genes in 3D space, using different connectivity
  matricies, derived from different types of data, such as gene expression, protein-protein interaction,
  or KEGG pathway data.


---
Overall, the Neurocave 3D brain visualization tool provides a comprehensive and
interactive platform to explore and analyze complex
neurogenomic datasets by visualizing brain regions and genes in 3D space and allowing for easy comparison and
exploration of different datasets and color codings. The decoupled control of glyph size, color coding, and
edge display controls provide users with the ability to customize the visualization to their specific
research needs while the search bar and animation controls provide a means of highlighting specific genes or
brain regions of interest.

Video tutorial links:

Exploration of Allen Brain MRI and Microarray data with Neurocave Part 1
https://youtu.be/S38jrbp1TZc
Intro to Allen neurogenomics data and Neurocave analysis. Adjust Node sizes and edge weight threshold. Search 
for WWOX gene and trace its expression regions.

Exploration of Allen Brain MRI and Microarray data with Neurocave Part 2
https://youtu.be/U_rfP-Ccn9U

Exploration of Allen Brain MRI and Microarray data with Neurocave Part 3
https://youtu.be/6fiWaj9TBFE
Exploring Allen Brain Institute connectomic and genomic data by browsing WWOX co-expression gene neighbors and other 
lncRNA genes along with high expression regions in brain and their Connectomics neighborhood.