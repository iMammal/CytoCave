Welcome to the NeuroCave 3D brain visualization tool demo! This tool provides a 
unique and interactive way to explore brain regions and their connectivity. Let's 
take a look at some of the features:

![caption](/home/morris/Pictures/SolarSystem.gif)

Independent glyph size control for left and right view windows allows 
users to adjust the size of the glyphs (cubes and spheres) independently for the left 
and right view windows. This is particularly useful when comparing brain regions or 
when focusing on a specific hemisphere.

?????Independent sphere and cube glyph control - users can choose to represent brain regions 
as cubes or spheres depending on their preference. This feature can help highlight 
different aspects of brain regions and their connections.

Independent control of ipsilateral and contralateral connectivity edge display 
toggle and threshold allows users to control the visibility of ipsilateral 
and contralateral connectivity edges separately. Users can also set a threshold for 
edge display, allowing them to focus on the most significant connections.

Independent control of region color visibility for left and right view window - 
users can set the visibility of brain region colors separately for the left and 
right view windows. This allows them to highlight specific brain regions and their 
connectivity.

Search bar to search for brain region of interest and display its connections - the 
search bar feature allows users to search for a specific brain region of interest 
and display its connections. This feature can help users focus on specific brain 
regions and their connectivity.

Animation amplitude and frequency control for pulsing and flashing of selected and 
connected nodes - the tool provides animation control features, allowing users to 
adjust the amplitude and frequency of pulsing and flashing for selected and 
connected nodes. This can help highlight important brain regions and their connections.

Overall, the NeuroCave 3D brain visualization tool provides a comprehensive and 
interactive way to explore brain regions and their connectivity.

The original NeuroCave connectomics visualization tool provided a powerful means of 
exploring brain connectome data with its 3D representation of brain regions as spheres 
and cubes for the two hemispheres 
and their connections as edges. Building on this foundation, we generaled NeuroCave to 
visualize neurogenomic datasets by incorporating additional features 
such as independent glyph scaling control, side-by-side window display, and independent 
color coding. 

Independent glyph scaling control sliders for spheres and cubes, including the decoupled 
left and right window glyph size sliders, allow the adjustment for point density difference 
and scale differences between two different datasets simultaneously visualized in the two windows.

3.  Decoupling the color code selector in the two windows allows for different color codings of the same 
dataset to be compared. For example, in the brain, anatomical regions are color coded on the left 
and connection degree range 
is color coded on the right to study connectivity degree fluctuations across various brain regions.
- displaying different colorings of the same data visualization, allows the user to draw correlations 
	between metrics such as anatomical regions and node degree in a brain connectome or similarly gene 
	ontology and centrality in gene networks
	
	- displaying different but complementary datasets in each window, with linked selection and edge display, 
	between them allows for comparisons between networks such as brain connectome on one side and gene network 
	on the other.


4. The search bar can be used to locate a specific brain region or gene of interest, and its connections 
or correlated regions can be highlighted in the visualization.

5. Animation controls can be used to highlight a specific gene or brain region and its connections by pulsing 
or flashing its sphere and edges, allowing for easy identification and visualization of important genes or 
brain regions.

6. The ipsilateral and contralateral connectivity edge display toggle and threshold can be adjusted to explore 
the connectivity pattern between brain regions and genes. For example, the threshold can be set to display only 
the strongest connections between brain regions and genes, or to explore the overall connectivity pattern within 
the dataset.

7. Large-scale single-cell omics studies can also be visualized in the same way, by using a 3D tSNE embedding of 
the cells instead of brain regions. The cells can be represented as spheres, and the genes as cubes, and both 
grouped based on their expression profilew, allowing for the exploration of gene expression patterns and cell 
types within the dataset. 
The independent glyph size and color coding control can be used to compare and contrast different aspects of the 
single-cell data across different regions of the 3D embedding.

8. The 3D platonic solid-based representation of clustering data can provide a means of
exploring the hierarchical clustering of cell relationships, neuronal circuits, or
gene networks.

Overall, the Neurocave 3D brain visualization tool provides a powerful platform to explore and analyze complex 
neurogenomic datasets by visualizing brain regions and genes in 3D space and allowing for easy comparison and 
exploration of different datasets and color codings. The decoupled control of glyph size, color coding, and 
connectivity edge display toggle provide users with the ability to customize the visualization to their specific 
research needs.




Morris Chukhman
Add a bulletpoint about how large scale single cell omics studies can be visualized in the same way but with a 
3D tSNE embedding of the cells instead of the brain samples.

Large-scale single-cell omics studies can also be visualized in the same way, by using a 3D tSNE embedding of 
the cells instead of brain regions. The cells can be represented as spheres, and the genes as cubes, and both 
grouped based on their expression profilew, allowing for the exploration of gene expression patterns and cell 
types within the dataset. 
The independent glyph size and color coding control can be used to compare and contrast different aspects of the 
single-cell data across different regions of the 3D embedding.



Morris Chukhman
add a bulletpoint about how the 3d platonic solid based representation of clustering data can  be used to explore the heirarchical clustering of cell relationships, neuronal circuits, or gene networks.
The 3D platonic solid based representation of clustering data can be used to explore the hierarchical clustering of cell relationships, neuronal circuits, or gene networks. The nodes in the network can be represented by spheres and the edges can be represented by lines connecting the nodes. The size and color of the spheres can be used to represent different features of the data such as gene expression levels or cell type. The edges can also be color coded to represent different types of connections or interactions between nodes. This type of visualization allows for easy exploration of complex network structures and relationships.

These new features enable the visualization and comparison of two
different datasets, such as brain connectome and gene network data, providing
insights into how these two datasets interact and influence each other. 
NeuroCave can also be used to visualize large-scale single-cell omics data by
replacing brain samples with cell embeddings in a 3D tSNE space, while 

