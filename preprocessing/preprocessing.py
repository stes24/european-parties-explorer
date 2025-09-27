import pandas
import matplotlib.pyplot as plt
from sklearn.manifold import MDS
from sklearn import preprocessing

years = [1999, 2002, 2006, 2010, 2014, 2019, 2024]
columns = ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family', 'eu_position', 'eu_intmark', 'eu_foreign', 'lrgen', 'lrecon',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'environment', 'regions', 'ethnic_minorities', 'nationalism']
columns_per_year = {
    1999: ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family', 'eu_position', 'eu_foreign', 'lrgen', 'lrecon'],
    2002: ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family', 'eu_position', 'eu_intmark', 'eu_foreign', 'lrgen', 'lrecon'],
    2006: ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family', 'eu_position', 'eu_intmark', 'eu_foreign', 'lrgen', 'lrecon',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'regions', 'ethnic_minorities'],
    2010: ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family', 'eu_position', 'eu_intmark', 'eu_foreign', 'lrgen', 'lrecon',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'environment', 'regions', 'ethnic_minorities'],
    2014: columns,
    2019: columns,
    2024: columns
}

# Filter columns from 1999-2019 dataset
df1 = pandas.read_csv('../public/dataset_1999.csv', na_values=[''], keep_default_na=False)  # Interpret only ,, (empty) as missing values
df1 = df1[columns]
df1.to_csv('../public/dataset_1999_filtered.csv', index=False)  # Don't save the index
print('1 - 1999-2019: filtered columns')

# Filter columns from 2024 dataset and make it coherent to the 1999-2019 dataset
df2 = pandas.read_csv('../public/dataset_2024.csv', na_values=[''], keep_default_na=False)
df2['year'] = 2024                                                          # Insert survey year
df2['sociallifestyle'] = (df2['womens_rights'] + df2['lgbtq_rights']) / 2   # sociallifestyle is not defined in the 2024 dataset
df2 = df2[columns]
df2.to_csv('../public/dataset_2024_filtered.csv', index=False)
print('2 - 2024: added year and sociallifestyle, filtered columns')

# Merge files
merged_df = pandas.concat([df1, df2], ignore_index=True)    # Create new progressive index without repetitions
merged_df.sort_values(['country', 'year'], inplace=True)    # Reorder 2024 data (keep overall ordering by country and year)
print('3 - Merged datasets')

# Remove countries with too little data
# TUR, NOR, SWI, ICE: no EU data
# MAL: too much missing data in 2024, only two parties
# LUX: too much missing data, no 2024 data
merged_df = merged_df[~merged_df['country'].isin([34, 35, 36, 37, 38, 45])] # Tilde inverts the result - keep only "True" rows

merged_df[['vote', 'epvote']] = merged_df[['vote', 'epvote']].fillna(0)     # Missing votes become 0%
merged_df[['vote', 'epvote']] = merged_df[['vote', 'epvote']].round(3)      # Use three decimal digits
print('4 - Removed appropriate countries, replaced missing votes')

# Delete rows with missing values - consider different sets of columns for each year
def delete_nulls(df, year, cols_in_year):
    df_year = df[df['year'] == year][cols_in_year].copy()     # Take the rows of the given year and only the relevant columns of that year
    df_year = df_year.dropna()      # Delete rows with nulls
    
    # Reverse scales so that 10 always means "agree"
    if (year >= 2006):
        df_year['spendvtax'] = 10 - df_year['spendvtax']
        df_year['redistribution'] = 10 - df_year['redistribution']
        df_year['multiculturalism'] = 10 - df_year['multiculturalism']
        df_year['ethnic_minorities'] = 10 - df_year['ethnic_minorities']
        df_year['sociallifestyle'] = 10 - df_year['sociallifestyle']
        df_year['regions'] = 10 - df_year['regions']
    if (year >= 2010):
        df_year['environment'] = 10 - df_year['environment']
    
    return df_year

no_nulls_dfs = [delete_nulls(merged_df, year, columns_per_year.get(year)) for year in years] # List comprehension - creates a new list from other lists
merged_df = pandas.concat(no_nulls_dfs, ignore_index=True)
merged_df.sort_values(['country', 'year'], inplace=True)
merged_df.to_csv('../public/merged_dataset.csv', index=False)
print('5 - Deleted appropriate missing values for each year and inverted scales')

# MDS --------------------------------

# For dimensionality reduction, consider only the "political topics"
excluded = ['country', 'year', 'party_id', 'party', 'vote', 'epvote', 'family']

# Prepare new columns for MDS results
merged_df['mds1'] = None
merged_df['mds2'] = None

for year in years:
    attributes = [attr for attr in columns_per_year.get(year) if attr not in excluded] # Use only topics present in that year
    
    # From the whole dataset, take only the year we're using and the needed attributes
    df_year = merged_df[merged_df['year'] == year].reset_index(drop=True)  # Reset index to 0 to avoid problems with data alignment
    df_year = df_year[attributes]
    
    std_scale = preprocessing.StandardScaler()      # Standardize data - same mean/deviation
    data = std_scale.fit_transform(df_year)         # Apply standardization
    
    # Apply MDS
    mds = MDS(normalized_stress='auto', random_state=64)
    points = mds.fit_transform(data)        # Coordinates of computed points
    
    # Plot inside Python
    plt.scatter(points[:, 0], points[:, 1])
    plt.xlabel('MDS dimension 1')
    plt.ylabel('MDS dimension 2')
    plt.show()
    
    # Add new coordinates to the original dataset
    merged_df.loc[merged_df['year'] == year, 'mds1'] = points[:, 0]
    merged_df.loc[merged_df['year'] == year, 'mds2'] = points[:, 1]

merged_df.to_csv('../public/merged_dataset_with_mds.csv', index=False)
print('6 - Applied dimensionality reduction and saved points\' coordinates')