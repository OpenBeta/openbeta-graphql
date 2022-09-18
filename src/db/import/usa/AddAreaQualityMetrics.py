from __future__ import annotations

import argparse
import pandas as pd

from bson.objectid import ObjectId
from pymongo import MongoClient


def read_arguments() -> tuple(str, str):
    """Reads arguments for accessing the DB and extra data

    Returns:
        The URI for connection to Mongo and the location of additional climb data
    """

    parser = argparse.ArgumentParser(description='MongoDB connection string components')

    # URI arguments
    parser.add_argument('--username', action='store', dest='username',
                        type=str, required=False, default='admin')
    parser.add_argument('--password', action='store', dest='password',
                        type=str, required=False, default='0nBelay!')
    parser.add_argument('--host', action='store', dest='host',
                        type=str, required=False, default='localhost')
    parser.add_argument('--port', action='store', dest='port',
                        type=str, required=False, default='27017')

    # route data location
    path = 'https://github.com/OpenBeta/climbing-data/blob/main/curated_datasets/'
    file = 'CuratedWithRatings_OpenBetaAug2020_RytherAnderson.pkl.zip'
    default = path + file
    parser.add_argument('--route_data', action='store', dest='route_data',
                        type=str, required=False, default=default)

    args = parser.parse_args()
    uri = f'mongodb://{args.username}:{args.password}@{args.host}:{args.port}/'

    return uri, args.route_data


class AreaQualityUpdater():

    def __init__(self, area_string: str = 'areas', climb_string: str = 'climbs'):
        """Initialize the MongoClient, check connection, load additional data,
           and extract area and climb collections

        Args:
            area_string: Key for the area collection
            climb_string: Key for the climb collection
        """

        uri, route_data_loc = read_arguments()
        self.client = MongoClient(uri,
                                  serverSelectionTimeoutMS=5,  # try to connect for 5s
                                  uuidRepresentation='standard')  # default is legacy
        self._test_connection()
        self._load_route_data(route_data_loc)
        self.areas = self.client.openbeta[area_string]
        self.climbs = self.client.openbeta[climb_string]

    def _test_connection(self) -> bool:
        """Test the connection, i.e. make sure the URI is correct

        Returns:
            bool: If a connection was established
        """
        self.client.server_info()
        print('Database connection established')

        return True

    def _load_route_data(self, route_data_loc: str) -> None:

        # loads route data from given location (defaults to github)
        print(route_data_loc)

    def _get_leaves(self, area_id: ObjectId) -> list[ObjectId]:
        """Get all the leaf nodes contained in the set of children of an area

        Args:
            area_id: The id of the area to get leaves for

        Returns:
            A list of the leaf nodes contained in the area
        """
        return []

    def _get_mp_route_ids(self, leaves: list[ObjectId]) -> list[str]:
        """Get all MP route ids for the areas in leaves

        Args:
            leaves: The leaf ids obtained from _get_leaves

        Returns:
            A flat list of all Mountain Project IDs in leaf areas
        """
        return []

    def _merge_route_data(self, mp_route_ids: list[str]) -> pd.DataFrame:
        """_summary_

        Args:
            mp_route_ids: The list of MP route IDs from _get_mp_route_ids

        Returns:
            A data frame with additional route data used to calculate
            quality metrics
        """
        return pd.DataFrame()

    def add_quality_metrics(self):

        # final method that adds quality metrics to the DB
        # for each area:
        # get all leaf areas (_get_leaves)
        # get all routes in leaf areas and their MP IDs
        # merge MP IDs with additional route data
        # calculate quality metrics
        # add to mongo

        ...


if __name__ == '__main__':

    pass
    # updater = AreaQualityUpdater()
    # updater.add_quality_metrics()
    # self.client.openbeta.list_collection_names()
