import pandas
import matplotlib.pyplot as plt
from sklearn.manifold import MDS
from sklearn import preprocessing

years = [1999, 2002, 2006, 2010, 2014, 2019, 2024]
columns = ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'nationalism', 'ethnic_minorities', 'environment', 'regions', 'eu_intmark', 'eu_foreign']
columns_per_year = {
    1999: ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position', 'eu_foreign'],
    2002: ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position', 'eu_intmark', 'eu_foreign'],
    2006: ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'ethnic_minorities', 'regions', 'eu_intmark', 'eu_foreign'],
    2010: ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'sociallifestyle', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'ethnic_minorities', 'environment', 'regions', 'eu_intmark', 'eu_foreign'],
    2014: columns,
    2019: columns,
    2024: ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family', 'lrgen', 'lrecon', 'eu_position',
           'spendvtax', 'deregulation', 'redistribution', 'civlib_laworder', 'womens_rights', 'lgbtq_rights', 'religious_principles',
           'immigrate_policy', 'multiculturalism', 'nationalism', 'ethnic_minorities', 'environment', 'regions', 'eu_intmark', 'eu_foreign']
}

# Filter columns, remove countries with too little data, reorder by country
# MAL: too much missing data in 2024, only two parties
# LUX: too much missing data, no 2024 data
df = pandas.read_csv('../public/1999-2024_CHES_dataset_means.csv', na_values=[''], keep_default_na=False) # Interpret only ,, (empty) as missing values
df = df[columns + ['womens_rights', 'lgbtq_rights']]
df = df[~df['country'].isin([37, 38])] # Tilde inverts the result - keep only "True" rows
df.sort_values(['country', 'year', 'party_id'], inplace=True)

print('1 - Filtered columns, removed appropriate countries, reordered by country')
df.to_csv('../public/dataset_reordered.csv', index=False) # Don't save the index

# Fix numerical values
df[['vote', 'seat', 'epvote']] = df[['vote', 'seat', 'epvote']].fillna(0) # Missing votes become 0%
df[['vote', 'seat', 'epvote']] = df[['vote', 'seat', 'epvote']].round(3)  # Use three decimal digits

# Delete rows with missing values - consider different sets of columns for each year
def delete_nulls(df, year, cols_in_year):
    df_year = df[df['year'] == year][cols_in_year].copy() # Take the rows of the given year and only the relevant columns of that year
    df_year = df_year.dropna()      # Delete rows with nulls
    
    # Adjust EU scales to 0 - 10 and 
    df_year['eu_position'] = (df_year['eu_position'] - 1) * 10 / 6
    df_year['eu_foreign'] = (df_year['eu_foreign'] - 1) * 10 / 6
    # Adjust left-right scale to -5 - 5
    df_year['lrgen'] = df_year['lrgen'] - 5
    df_year['lrecon'] = df_year['lrecon'] - 5
    # Reverse scales so that 10 always means "agree"
    if (year >= 2002):
        df_year['eu_intmark'] = (df_year['eu_intmark'] - 1) * 10 / 6
    if (year >= 2006):
        df_year['spendvtax'] = 10 - df_year['spendvtax']
        df_year['redistribution'] = 10 - df_year['redistribution']
        df_year['multiculturalism'] = 10 - df_year['multiculturalism']
        df_year['ethnic_minorities'] = 10 - df_year['ethnic_minorities']
        df_year['regions'] = 10 - df_year['regions']
    if (year >= 2006 and year < 2024):
        df_year['sociallifestyle'] = 10 - df_year['sociallifestyle']
    if (year >= 2010):
        df_year['environment'] = 10 - df_year['environment']
    if (year == 2024):
        df_year['womens_rights'] = 10 - df_year['womens_rights']
        df_year['lgbtq_rights'] = 10 - df_year['lgbtq_rights']
    
    return df_year

no_nulls_dfs = [delete_nulls(df, year, columns_per_year.get(year)) for year in years] # List comprehension - creates a new list from other lists
df = pandas.concat(no_nulls_dfs, ignore_index=True)
df.sort_values(['country', 'year', 'party_id'], inplace=True)

print('2 - Replaced missing votes, deleted appropriate missing values for each year, adjusted scales')

# Compute sociallifestyle for 2024, remove womens_rights and lgbtq_rights
df.loc[df['year'] == 2024, 'sociallifestyle'] = df.loc[df['year'] == 2024, ['womens_rights', 'lgbtq_rights']].mean(axis=1) # Replace 2024 sociallifestyle with the mean
df = df.drop(columns=["womens_rights", "lgbtq_rights"])

print('3 - Computed sociallifestyle for 2024, removed womens_rights and lgbtq_rights')

def computeRegion(country):
    if (country in [1, 3, 6, 10, 13]): # BE, GE, FR, NL, AUS
        return 'West'
    elif (country in [2, 7, 11, 14, 16, 22, 24, 25]): # DK, IRL, UK, FIN, SV, EST, LAT, LITH
        return 'North'
    elif (country in [4, 5, 8, 12, 29, 31, 40]): # GR, ESP, IT, POR, SLE, CRO, CYP
        return 'South'
    elif (country in [20, 21, 23, 26, 27, 28]): # BUL, CZ, HUN, POL, ROM, SLO
        return 'East'
df['region'] = df['country'].apply(computeRegion)

print('4 - Computed European regions')

# Create new "positive" scales for left and right for radviz
def left(x):
    if x <= 0:
        return -x
    else:
        return 0
def right(x):
    if x >= 0:
        return x
    else:
        return 0
df['leftgen'] = df['lrgen'].apply(left)
df['rightgen'] = df['lrgen'].apply(right)
df['leftecon'] = df['lrecon'].apply(left)
df['rightecon'] = df['lrecon'].apply(right)

print('5 - Recomputed left and right for radviz')
df.to_csv('../public/dataset_final.csv', index=False)

# MDS --------------------------------

# For dimensionality reduction, consider only the "political topics"
excluded = ['country', 'year', 'party_id', 'party', 'vote', 'seat', 'epvote', 'family']

# Prepare new columns for MDS results
df['mds1'] = None
df['mds2'] = None

columns_per_year[2024] = columns

for year in years:
    attributes = [attr for attr in columns_per_year.get(year) if attr not in excluded] # Use only topics present in that year
    
    # From the whole dataset, take only the year we're using and the needed attributes
    df_year = df[df['year'] == year].reset_index(drop=True)  # Reset index to 0 to avoid problems with data alignment
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
    df.loc[df['year'] == year, 'mds1'] = points[:, 0]
    df.loc[df['year'] == year, 'mds2'] = points[:, 1]

df.to_csv('../public/dataset_final_with_mds.csv', index=False)
print('6 - Applied dimensionality reduction and saved points\' coordinates')