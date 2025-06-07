#include <iostream>
#include <vector>
using namespace std;

const int N = 6; // Number of nodes (1-based indexing)

vector<int> adj[N]; // Adjacency list
bool visited[N];    // Visited array

// DFS function
void dfs(int node) {
    visited[node] = true;
    cout << node << " ";

    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(neighbor);
        }
    }
}

int main() {
    // Build the graph (undirected)
    adj[1].push_back(2);
    adj[2].push_back(1);

    adj[1].push_back(3);
    adj[3].push_back(1);

    adj[3].push_back(4);
    adj[4].push_back(3);

    adj[3].push_back(5);
    adj[5].push_back(3);

    // Initialize visited array to false
    for (int i = 0; i < N; ++i) visited[i] = false;

    // Run DFS from node 1
    cout << "DFS traversal starting from node 1: ";
    dfs(1);

    return 0;
}

